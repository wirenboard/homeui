import mqtt from 'mqtt';

interface WorkerSelf {
  postMessage(message: unknown): void;
  onmessage: ((ev: MessageEvent) => void) | null;
}
const ctx = self as unknown as WorkerSelf;

const textDecoder = new TextDecoder();

function decodeMqttPayload(buf: Uint8Array): string {
  let needsConversion = false;
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0xED && buf[i + 1] >= 0xA0) {
      needsConversion = true;
      break;
    }
  }

  if (!needsConversion) {
    return textDecoder.decode(buf);
  }

  const out: number[] = [];
  for (let i = 0; i < buf.length;) {
    if (
      i + 5 < buf.length
      && buf[i] === 0xED && (buf[i + 1] & 0xF0) === 0xA0
      && buf[i + 3] === 0xED && (buf[i + 4] & 0xF0) === 0xB0
    ) {
      const hi = ((buf[i] & 0x0F) << 12) | ((buf[i + 1] & 0x3F) << 6) | (buf[i + 2] & 0x3F);
      const lo = ((buf[i + 3] & 0x0F) << 12) | ((buf[i + 4] & 0x3F) << 6) | (buf[i + 5] & 0x3F);
      const cp = 0x10000 + ((hi - 0xD800) << 10) + (lo - 0xDC00);
      out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
      i += 6;
    } else {
      out.push(buf[i]);
      i++;
    }
  }
  return textDecoder.decode(new Uint8Array(out));
}

let client: ReturnType<typeof mqtt.connect> | null = null;
let globalPrefix = '';
let retainHackTopic = '';
let retainIsDone = false;
let connected = false;

type BatchEntry = [string, string, number, number];
let pending: BatchEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  flushTimer = null;
  if (pending.length === 0) return;
  const batch = pending;
  pending = [];
  ctx.postMessage({ type: 'messages', batch });
}

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(flush, 16);
}

function handleMessage(topic: string, payload: Uint8Array, qos: number, retain: boolean) {
  const payloadString = decodeMqttPayload(payload);

  let outputTopic = topic;
  const retainFullTopic = globalPrefix + retainHackTopic;
  if (!retainIsDone && outputTopic === retainFullTopic) {
    retainIsDone = true;
    ctx.postMessage({ type: 'retainReady' });
    return;
  }

  if (globalPrefix && outputTopic.startsWith(globalPrefix)) {
    outputTopic = outputTopic.substring(globalPrefix.length);
  }

  pending.push([outputTopic, payloadString, qos, retain ? 1 : 0]);
  scheduleFlush();
}

ctx.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  switch (msg.type) {
    case 'connect': {
      if (client) {
        client.end(true);
        client = null;
      }
      connected = false;
      retainIsDone = false;
      globalPrefix = msg.globalPrefix || '';
      retainHackTopic = '/tmp/' + msg.clientId + '/retain_hack';

      const wsUrl = msg.url.replace(/^http(s?):\/\//, 'ws$1://');
      const options: Record<string, unknown> = {
        clientId: msg.clientId,
        reconnectPeriod: 15000,
        connectTimeout: 15000,
        resubscribe: false,
      };
      if (msg.user && msg.password) {
        options.username = msg.user;
        options.password = msg.password;
      }

      client = mqtt.connect(wsUrl, options as any);

      client.on('connect', () => {
        if (connected) return;
        connected = true;
        ctx.postMessage({ type: 'connected' });
      });

      client.on('message', (topic, payload, packet) => {
        handleMessage(topic, payload as unknown as Uint8Array, packet.qos, packet.retain);
      });

      client.on('close', () => {
        if (!connected) return;
        connected = false;
        ctx.postMessage({ type: 'connectionLost' });
      });

      client.on('reconnect', () => {
        ctx.postMessage({ type: 'reconnecting' });
      });

      break;
    }

    case 'subscribe': {
      if (client && connected) {
        client.subscribe(globalPrefix + msg.topic);
      }
      break;
    }

    case 'subscribeRetainHack': {
      if (client) {
        const hackTopic = globalPrefix + retainHackTopic;
        client.subscribe(hackTopic, { qos: 2 });
        client.publish(hackTopic, '1', { qos: 2 });
      }
      break;
    }

    case 'unsubscribe': {
      if (client && connected) {
        try {
          client.unsubscribe(globalPrefix + msg.topic);
        } catch (_) { /* ignore */ }
      }
      break;
    }

    case 'send': {
      if (client && connected) {
        client.publish(globalPrefix + msg.topic, msg.payload ?? '', {
          qos: msg.qos ?? 1,
          retain: msg.retained ?? true,
        });
      }
      break;
    }

    case 'disconnect': {
      connected = false;
      retainIsDone = false;
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      pending = [];
      if (client) {
        client.end(true);
        client = null;
      }
      break;
    }
  }
};
