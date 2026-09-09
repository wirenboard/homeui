import mqtt from 'mqtt';
import type { IPublishPacket } from 'mqtt';
import { authStore } from '@/stores/auth';
import { uiStore } from '@/stores/ui';
import { decodeMqttPayload, topicMatches, type MqttCallback, type MqttMessage } from './mqtt-helpers';

export type { MqttMessage, MqttCallback } from './mqtt-helpers';

interface CancellablePromise extends Promise<void> {
  _cancel: () => void;
}

class MqttClient {
  #client: ReturnType<typeof mqtt.connect> | null = null;
  #worker: Worker | null = null;
  #id = '';
  #globalPrefix = '';
  #connected = false;
  #callbackMap: Record<string, MqttCallback[]> = Object.create(null);
  #sortedPatterns: string[] = [];
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
    if (this.#worker) {
      this.#worker.terminate();
      this.#worker = null;
    }
    if (this.#client) {
      this.#client.end(true);
      this.#client = null;
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

    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      try {
        const worker = new Worker(
          new URL('./mqtt-worker.ts', import.meta.url),
          { type: 'module' },
        );
        worker.onmessage = (e) => this.#onWorkerMessage(e.data);
        worker.onerror = (err) => {
          console.warn('MQTT Worker failed, using direct connection:', err.message);
          worker.terminate();
          this.#worker = null;
          this.#connectDirect(url, clientId, user, password);
        };
        this.#worker = worker;
        worker.postMessage({
          type: 'connect',
          url,
          clientId,
          user,
          password,
          globalPrefix: this.#globalPrefix,
        });
        return;
      } catch {
        // Worker creation failed, fall through to direct connection
      }
    }
    this.#connectDirect(url, clientId, user, password);
  }

  #connectDirect(url: string, clientId: string, user?: string, password?: string): void {
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
      this.#onMessage(topic, decodeMqttPayload(payload), packet),
    );
    this.#client.on('close', () => this.#onConnectionLost());
    this.#client.on('reconnect', () => this.#checkAuth());
  }

  #onWorkerMessage(msg: any): void {
    switch (msg.type) {
      case 'connected':
        this.#onConnect();
        break;
      case 'connectionLost':
        this.#onConnectionLost();
        break;
      case 'reconnecting':
        this.#checkAuth();
        break;
      case 'retainReady':
        if (!this.#retainIsDone) {
          this.#retainIsDone = true;
          this.#retainReadyResolve?.();
        }
        break;
      case 'messages':
        this.#onWorkerBatch(msg.batch);
        break;
    }
  }

  #onWorkerBatch(batch: [string, string, number, number][]): void {
    for (const [topic, payload, qos, retained] of batch) {
      const data: MqttMessage = { topic, payload, qos, retained: retained === 1 };
      for (const pattern of this.#sortedPatterns) {
        if (!topicMatches(pattern, topic)) continue;
        try {
          const callbacks = this.#callbackMap[pattern];
          for (let i = 0; i < callbacks.length; i++) {
            callbacks[i](data);
          }
        } catch (err) {
          console.error('malformed data in MQTT topic %s: %s', topic, String(err));
        }
      }
    }
  }

  subscribe(topic: string, callback: MqttCallback): void {
    if (!this.#connected) {
      console.error('can\'t subscribe(): disconnected');
      return;
    }
    if (this.#worker) {
      this.#worker.postMessage({ type: 'subscribe', topic });
    } else {
      this.#client!.subscribe(this.#globalPrefix + topic);
    }
    this.#callbackMap[topic] = (this.#callbackMap[topic] || []).concat([callback]);
    this.#sortedPatterns = Object.keys(this.#callbackMap).sort();
  }

  addStickySubscription(topic: string, callback: MqttCallback): void {
    this.#stickySubscriptions.push({ topic, callback });
    if (this.#connected) this.subscribe(topic, callback);
  }

  unsubscribe(topic: string): void {
    this.#stickySubscriptions = this.#stickySubscriptions.filter((item) => item.topic !== topic);
    delete this.#callbackMap[topic];
    this.#sortedPatterns = Object.keys(this.#callbackMap).sort();
    if (this.#connected) {
      if (this.#worker) {
        this.#worker.postMessage({ type: 'unsubscribe', topic });
      } else {
        try {
          this.#client!.unsubscribe(this.#globalPrefix + topic);
        } catch (err) {
          console.warn('Unsubscribe failed for ' + topic + ':', err);
        }
      }
    }
  }

  send(destination: string, payload?: string | null, retained?: boolean, qos?: 0 | 1 | 2): void {
    if (!this.#connected) {
      console.error('can\'t send(): disconnected');
      return;
    }
    if (this.#worker) {
      this.#worker.postMessage({
        type: 'send',
        topic: destination,
        payload: payload ?? '',
        retained: retained ?? true,
        qos: qos ?? 1,
      });
    } else {
      const topic = this.#globalPrefix + destination;
      this.#client!.publish(topic, payload ?? '', {
        qos: qos ?? 1,
        retain: retained ?? true,
      });
    }
  }

  reconnect(url: string, user?: string, password?: string): void {
    if (this.#connected) {
      this.disconnect();
    }
    this.connect(url, this.#generateClientId(), user, password);
  }

  disconnect(): void {
    this.#callbackMap = Object.create(null);
    this.#sortedPatterns = [];
    this.#connected = false;
    if (this.#worker) {
      this.#worker.postMessage({ type: 'disconnect' });
      this.#worker.terminate();
      this.#worker = null;
    }
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

    if (this.#worker) {
      this.#worker.postMessage({ type: 'subscribeRetainHack' });
    } else {
      const hackTopic = this.#globalPrefix + this.#retainHackTopic;
      this.#client!.subscribe(hackTopic, { qos: 2 });
      this.#client!.publish(hackTopic, '1', { qos: 2 });
    }

    const listeners = this.#connectListeners;
    this.#connectListeners = [];
    listeners.forEach((fn) => fn());
  }

  #onConnectionLost(): void {
    if (!this.#connected) return;
    this.#connected = false;
    this.#callbackMap = Object.create(null);
    this.#sortedPatterns = [];
    console.warn('Server connection lost');
    this.isConnected();
  }

  #checkAuth(): void {
    authStore.checkAuth().catch(() => {
      if (!authStore.isAuthenticated) {
        if (this.#worker) {
          this.#worker.postMessage({ type: 'disconnect' });
          this.#worker.terminate();
          this.#worker = null;
        }
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

    const data: MqttMessage = {
      topic: outputTopic,
      payload: payloadString,
      qos: packet.qos,
      retained: packet.retain,
    };

    for (const pattern of this.#sortedPatterns) {
      if (!topicMatches(pattern, outputTopic)) continue;
      try {
        const callbacks = this.#callbackMap[pattern];
        for (let i = 0; i < callbacks.length; i++) {
          callbacks[i](data);
        }
      } catch (err) {
        console.error('malformed data in MQTT topic %s: %s', outputTopic, String(err));
      }
    }
  }
}

export const mqttClient = new MqttClient();
