import { mqttClient } from '@/services';

const RPC_TIMEOUT = 60000;
const METHOD_AVAILABLE_TIMEOUT = 3000;

interface RpcError {
  data: string;
  message: string;
}

const disconnectedError: RpcError = {
  data: 'MqttConnectionError',
  message: 'MQTT client is not connected',
};

const timeoutError: RpcError = {
  data: 'MqttTimeoutError',
  message: 'MQTT RPC request timed out',
};

type ResponseHandler = (topic: string | null, reply: any) => void;

let nextId = 1;
const inflight: Record<number, ResponseHandler> = {};
const subs: Record<string, boolean> = Object.create(null);
const methods: Record<string, any> = {};
let disconnectUnsubscribe: (() => void) | null = null;

function invokeResponseHandler(id: number, topic: string | null, reply: any) {
  try {
    inflight[id](topic, reply);
  } finally {
    delete inflight[id];
    maybeStopWatching();
  }
}

function handleDisconnection() {
  Object.keys(inflight)
    .sort()
    .forEach((callId) => {
      invokeResponseHandler(Number(callId), null, { error: disconnectedError });
    });

  Object.keys(methods).forEach((method) => {
    if (methods[method].timeout) {
      mqttClient.cancel(methods[method].timeout);
    }
    methods[method].reject?.(disconnectedError);
  });

  for (const key of Object.keys(methods)) {
    delete methods[key];
  }

  if (Object.keys(inflight).length) {
    throw new Error('Proxy._handleDisconnection(): pending requests remained');
  }
  maybeStopWatching();
}

function maybeStartWatching() {
  if (disconnectUnsubscribe !== null) return;
  let prevConnected = mqttClient.isConnected();
  const check = () => {
    const connected = mqttClient.isConnected();
    if (prevConnected && !connected) {
      handleDisconnection();
    }
    prevConnected = connected;
  };
  const interval = setInterval(check, 200);
  disconnectUnsubscribe = () => {
    clearInterval(interval);
    disconnectUnsubscribe = null;
  };
}

function maybeStopWatching() {
  if (Object.keys(inflight).length || !disconnectUnsubscribe) return;
  disconnectUnsubscribe();
}

function handleMessage(msg: { topic: string; payload: string }) {
  let parsed: any;
  try {
    parsed = JSON.parse(msg.payload);
  } catch {
    console.error('cannot parse MQTT RPC response: %o', msg);
    return;
  }
  if (!Object.hasOwn(parsed, 'id')) {
    console.error('MQTT response without id: %o', msg);
    return;
  }
  if (!Object.hasOwn(inflight, parsed.id)) {
    console.error('MQTT response with unexpected id: %o', msg);
    return;
  }
  invokeResponseHandler(parsed.id, msg.topic, parsed);
}

function ensureSubscription(topic: string) {
  if (subs[topic]) return;
  subs[topic] = true;
  mqttClient.addStickySubscription(topic, handleMessage);
}

function rpcCall(prefix: string, method: string, params?: Record<string, any>): Promise<any> {
  ensureSubscription(prefix + '+/' + mqttClient.getID() + '/reply');
  maybeStartWatching();

  return new Promise((resolve, reject) => {
    if (!mqttClient.isConnected()) {
      reject(disconnectedError);
      return;
    }

    const callId = nextId++;
    const topic = prefix + method + '/' + mqttClient.getID();

    try {
      mqttClient.send(
        topic,
        JSON.stringify({
          id: callId,
          params: params || {},
        }),
        false,
      );
    } catch (err) {
      reject(err);
      return;
    }

    const timeout = mqttClient.timeout(
      invokeResponseHandler.bind(null, callId, null, { error: timeoutError }),
      RPC_TIMEOUT,
    );

    inflight[callId] = (actualTopic: string | null, reply: any) => {
      mqttClient.cancel(timeout);
      if (actualTopic !== null && actualTopic !== topic + '/reply') {
        reject('unexpected response topic ' + actualTopic);
      } else if (Object.hasOwn(reply, 'error') && reply.error !== null) {
        reject(reply.error);
      } else {
        resolve(reply.result);
      }
    };
  });
}

function rpcHasMethod(prefix: string, method: string): Promise<boolean> {
  const topic = prefix + method;
  if (!subs[topic]) {
    subs[topic] = true;
    mqttClient.addStickySubscription(topic, () => {
      if (methods[method].timeout) {
        mqttClient.cancel(methods[method].timeout);
      }
      methods[method].available = true;
      methods[method].resolve(true);
    });
  }
  maybeStartWatching();

  if (methods[method] === undefined) {
    methods[method] = {};
    methods[method].promise = new Promise<boolean>((resolve, reject) => {
      methods[method].resolve = resolve;
      methods[method].reject = reject;
    });

    if (methods[method].available !== undefined) {
      methods[method].resolve(methods[method].available);
      return methods[method].promise;
    }

    methods[method].timeout = mqttClient.timeout(() => {
      methods[method].available = false;
      methods[method].resolve(false);
    }, METHOD_AVAILABLE_TIMEOUT);
  }

  return methods[method].promise;
}

type RpcMethod = (params?: any) => Promise<any>;
type RpcMethods = Record<string, RpcMethod>;

export type RpcProxy<
  T extends { [K in keyof T]: RpcMethod } = RpcMethods
> = T & {
  hasMethod: (method: string) => Promise<boolean>;
};

export function createRpcProxy<
  T extends { [K in keyof T]: RpcMethod } = RpcMethods
>(target: string, methodNames: string[]): RpcProxy<T> {
  const prefix = '/rpc/v1/' + target + '/';
  const proxy: any = {};

  methodNames.forEach((method) => {
    proxy[method] = (params?: any) => rpcCall(prefix, method, params);
  });

  proxy.hasMethod = (methodName: string) => rpcHasMethod(prefix, methodName);

  return proxy as RpcProxy<T>;
}
