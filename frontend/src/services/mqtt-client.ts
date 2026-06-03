import mqtt from 'mqtt';
import type { IPublishPacket } from 'mqtt';
import { authStore } from '@/stores/auth';
import { uiStore } from '@/stores/ui';

export interface MqttMessage {
  topic: string;
  payload: string;
  qos: number;
  retained: boolean;
}

export type MqttCallback = (message: MqttMessage) => void;

function topicMatches(pattern: string, topic: string): boolean {
  function match(patternParts: string[], topicParts: string[]): boolean {
    if (!patternParts.length) return !topicParts.length;
    if (patternParts[0] === '#') {
      if (patternParts.length !== 1) throw new Error('invalid pattern');
      return true;
    }
    if (!topicParts.length) return false;
    if (patternParts[0] !== '+' && topicParts[0] !== patternParts[0]) return false;
    return match(patternParts.slice(1), topicParts.slice(1));
  }
  return match(pattern.split('/'), topic.split('/'));
}

interface CancellablePromise extends Promise<void> {
  _cancel: () => void;
}

class MqttClient {
  #client: ReturnType<typeof mqtt.connect> | null = null;
  #id = '';
  #globalPrefix = '';
  #connected = false;
  #callbackMap: Record<string, MqttCallback[]> = Object.create(null);
  #stickySubscriptions: Array<{ topic: string; callback: MqttCallback }> = [];
  #connectListeners: Array<() => void> = [];
  #retainReadyResolve: (() => void) | null = null;
  #retainReady: Promise<void> | null = null;
  #retainIsDone = false;
  #retainHackTopic = '';

  constructor() {
    if (localStorage['prefix'] === 'true') {
      this.#globalPrefix = '/client/' + localStorage['user'];
    }
  }

  connect(url: string, clientId: string, user?: string, password?: string): void {
    if (this.#client) {
      this.#client.end(true);
    }

    this.#id = clientId;
    this.#connected = false;
    this.#retainIsDone = false;
    this.#retainHackTopic = '/tmp/' + clientId + '/retain_hack';
    this.#retainReady = new Promise<void>((resolve) => {
      this.#retainReadyResolve = resolve;
    });

    const keysToRemove: string[] = [];
    for (const key in localStorage) {
      if (key.indexOf('Sent:') === 0 || key.indexOf('Received:') === 0) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    const wsUrl = url.replace(/^http(s?):\/\//, 'ws$1://');

    const options: Parameters<typeof mqtt.connect>[1] = {
      clientId,
      reconnectPeriod: 15000,
      connectTimeout: 15000,
      resubscribe: false,
    };
    if (user && password) {
      options.username = user;
      options.password = password;
    }

    this.#client = mqtt.connect(wsUrl, options);
    this.#client.on('connect', () => this.#onConnect());
    this.#client.on('message', (topic: string, payload: Buffer, packet: IPublishPacket) =>
      this.#onMessage(topic, payload.toString(), packet),
    );
    this.#client.on('close', () => this.#onConnectionLost());
    this.#client.on('reconnect', () => this.#checkAuth());
  }

  subscribe(topic: string, callback: MqttCallback): void {
    if (!this.#connected) {
      console.error('can\'t subscribe(): disconnected');
      return;
    }
    this.#client!.subscribe(this.#globalPrefix + topic);
    this.#callbackMap[topic] = (this.#callbackMap[topic] || []).concat([callback]);
  }

  addStickySubscription(topic: string, callback: MqttCallback): void {
    this.#stickySubscriptions.push({ topic, callback });
    if (this.#connected) this.subscribe(topic, callback);
  }

  unsubscribe(topic: string): void {
    this.#stickySubscriptions = this.#stickySubscriptions.filter((item) => item.topic !== topic);
    delete this.#callbackMap[topic];
    if (this.#connected) {
      try {
        this.#client!.unsubscribe(this.#globalPrefix + topic);
      } catch (err) {
        console.warn('Unsubscribe failed for ' + topic + ':', err);
      }
    }
  }

  send(destination: string, payload?: string | null, retained?: boolean, qos?: 0 | 1 | 2): void {
    if (!this.#connected) {
      console.error('can\'t send(): disconnected');
      return;
    }
    const topic = this.#globalPrefix + destination;
    this.#client!.publish(topic, payload ?? '', {
      qos: qos ?? 1,
      retain: retained ?? true,
    });
  }

  reconnect(url: string, user?: string, password?: string): void {
    if (this.#connected) {
      this.disconnect();
    }
    this.connect(url, this.#generateClientId(), user, password);
  }

  disconnect(): void {
    this.#callbackMap = Object.create(null);
    this.#connected = false;
    if (this.#client) {
      this.#client.end(true);
      this.#client = null;
    }
    this.isConnected();
  }

  isConnected(): boolean {
    uiStore.setIsConnected(this.#connected);
    return this.#connected;
  }

  getID(): string {
    return this.#id;
  }

  whenReady(): Promise<void> {
    return this.#retainReady!;
  }

  whenConnected(): Promise<void> {
    if (this.#connected) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.#connectListeners.push(resolve);
    });
  }

  timeout(callback: () => void, delay: number): CancellablePromise {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const promise = this.whenReady().then(() => {
      if (cancelled) return;
      return new Promise<void>((resolve) => {
        timeoutId = setTimeout(() => {
          resolve();
          callback();
        }, delay);
      });
    }) as CancellablePromise;
    promise._cancel = () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
    return promise;
  }

  cancel(promise: CancellablePromise): void {
    if (promise?._cancel) {
      promise._cancel();
    }
  }

  #generateClientId(): string {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 10; i++) text += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'wb-mqtt-homeui-' + text;
  }

  #onConnect(): void {
    if (this.#connected) return;
    this.#connected = true;
    this.isConnected();

    this.#stickySubscriptions.forEach(({ topic, callback }) => {
      this.subscribe(topic, callback);
    });

    // Retain hack: publish to a temp topic with QoS 2.
    // The broker delivers all retained messages before this one,
    // so its arrival signals that all retained messages have been received.
    const hackTopic = this.#globalPrefix + this.#retainHackTopic;
    this.#client!.subscribe(hackTopic, { qos: 2 });
    this.#client!.publish(hackTopic, '1', { qos: 2 });

    const listeners = this.#connectListeners;
    this.#connectListeners = [];
    listeners.forEach((fn) => fn());
  }

  #onConnectionLost(): void {
    if (!this.#connected) return;
    this.#connected = false;
    this.#callbackMap = Object.create(null);
    console.warn('Server connection lost');
    this.isConnected();
  }

  #checkAuth(): void {
    authStore.checkAuth().catch(() => {
      if (!authStore.isAuthenticated) {
        this.#client?.end();
        location.reload();
      }
    });
  }

  #onMessage(topic: string, payloadString: string, packet: IPublishPacket): void {
    let outputTopic = topic;
    const retainFullTopic = this.#globalPrefix + this.#retainHackTopic;
    if (!this.#retainIsDone && outputTopic === retainFullTopic) {
      this.#retainIsDone = true;
      this.#retainReadyResolve?.();
      return;
    }

    if (this.#globalPrefix && outputTopic.startsWith(this.#globalPrefix)) {
      outputTopic = outputTopic.substring(this.#globalPrefix.length);
    }

    Object.keys(this.#callbackMap)
      .sort()
      .forEach((pattern) => {
        if (!topicMatches(pattern, outputTopic)) return;
        try {
          const data: MqttMessage = {
            topic: outputTopic,
            payload: payloadString,
            qos: packet.qos,
            retained: packet.retain,
          };
          this.#callbackMap[pattern].forEach((callback) => callback(data));
        } catch (err) {
          console.error('malformed data in MQTT topic %s: %s', outputTopic, String(err));
        }
      });
  }
}

export const mqttClient = new MqttClient();
