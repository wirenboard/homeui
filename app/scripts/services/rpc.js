import mqttServiceModule from './mqttService';

//-----------------------------------------------------------------------------
const mqttRpcServiceModule = angular
  .module('homeuiApp.MqttRpc', [mqttServiceModule])
  .value('mqttRpcTimeout', 60000)
  .value('mqttRpcMethodAvailableTimeout', 3000)
  .factory('MqttRpc', mqttRpc).name;

//-----------------------------------------------------------------------------
function mqttRpc(
  $q,
  $rootScope,
  mqttClient,
  mqttRpcTimeout,
  mqttRpcMethodAvailableTimeout,
  Spinner
) {
  'ngInject';

  var disconnectedError = {
    data: 'MqttConnectionError',
    message: 'MQTT client is not connected',
  };

  var timeoutError = {
    data: 'MqttTimeoutError',
    message: 'MQTT RPC request timed out',
  };

  var nextId = 1,
    inflight = {},
    watchStopper = null,
    subs = Object.create(null),
    methods = {};

  //.............................................................................
  function invokeResponseHandler(id, topic, reply) {
    try {
      inflight[id](topic, reply);
    } finally {
      delete inflight[id];
      maybeStopWatching();
    }
  }

  //.............................................................................
  function handleDisconnection() {
    Object.keys(inflight)
      .sort()
      .forEach(callId => {
        invokeResponseHandler(callId, null, {
          error: disconnectedError,
        });
      });
    Object.keys(methods).forEach(method => {
      if (methods[method].timeout) {
        mqttClient.cancel(methods[method].timeout);
      }
      methods[method].defered.reject(disconnectedError);
    });
    methods = {};
    if (Object.keys(inflight).length)
      throw new Error('Proxy._handleDisconnection(): pending requests remained');
    maybeStopWatching();
  }

  //.............................................................................
  function maybeStartWatching() {
    if (watchStopper !== null) return;
    watchStopper = $rootScope.$watch(
      () => mqttClient.isConnected(),
      connected => {
        if (!connected) handleDisconnection();
      }
    );
  }

  //.............................................................................
  function maybeStopWatching() {
    if (Object.keys(inflight).length || !watchStopper) return;
    watchStopper();
    watchStopper = null;
  }

  //.............................................................................
  function handleMessage(msg) {
    try {
      var parsed = JSON.parse(msg.payload);
    } catch (e) {
      console.error('cannot parse MQTT RPC response: %o', msg);
      return;
    }
    if (!parsed.hasOwnProperty('id')) {
      console.error('MQTT response without id: %o', msg);
      return;
    }
    if (!inflight.hasOwnProperty(parsed.id)) {
      console.error('MQTT response with unexpected id: %o', msg);
      return;
    }
    invokeResponseHandler(parsed.id, msg.topic, parsed);
  }

  //.............................................................................
  function ensureSubscription(topic) {
    if (subs[topic]) return;
    subs[topic] = true;
    mqttClient.addStickySubscription(topic, handleMessage);
  }

  //-----------------------------------------------------------------------------
  class Proxy {
    //.............................................................................
    constructor(target, spinnerIdPrefix) {
      this._prefix = '/rpc/v1/' + target + '/';
      this._watchStopper = null;
      this._spinnerIdPrefix = spinnerIdPrefix || 'mqttRpc';
    }

    //.............................................................................
    _init() {
      ensureSubscription(this._prefix + '+/' + mqttClient.getID() + '/reply');
    }

    //.............................................................................
    _call(method, params) {
      this._init();
      maybeStartWatching();
      return $q((resolve, reject) => {
        if (!mqttClient.isConnected()) {
          reject(disconnectedError);
          return;
        }
        var callId = nextId++;
        var topic = this._prefix + method + '/' + mqttClient.getID();
        try {
          mqttClient.send(
            topic,
            JSON.stringify({
              id: callId,
              params: params || {},
            }),
            false
          );
        } catch (err) {
          reject(err);
        }
        var timeout = mqttClient.timeout(
          invokeResponseHandler.bind(null, callId, null, {
            error: timeoutError,
          }),
          mqttRpcTimeout
        );

        Spinner.start(this._spinnerIdPrefix, callId);
        inflight[callId] = (actualTopic, reply) => {
          Spinner.stop(this._spinnerIdPrefix, callId);
          mqttClient.cancel(timeout);
          if (actualTopic !== null && actualTopic != topic + '/reply')
            reject('unexpected response topic ' + actualTopic);
          else if (reply.hasOwnProperty('error') && reply.error !== null) reject(reply.error);
          else resolve(reply.result);
        };
      });
    }

    //.............................................................................
    _hasMethod(method) {
      var topic = this._prefix + method;
      if (!subs[topic]) {
        subs[topic] = true;
        mqttClient.addStickySubscription(topic, () => {
          if (methods[method].timeout) {
            mqttClient.cancel(methods[method].timeout);
          }
          methods[method].available = true;
          methods[method].defered.resolve(true);
        });
      }
      maybeStartWatching();
      if (methods[method] === undefined) {
        methods[method] = {};
        var defered = $q.defer();
        methods[method].defered = defered;
        if (methods[method].available !== undefined) {
          defered.resolve(methods[method].available);
          return defered.promise;
        }
        methods[method].timeout = mqttClient.timeout(() => {
          methods[method].available = false;
          defered.resolve(false);
        }, mqttRpcMethodAvailableTimeout);
      }
      return methods[method].defered.promise;
    }
  }

  //-----------------------------------------------------------------------------
  return {
    getProxy(target, methods, spinnerIdPrefix) {
      var proxy = new Proxy(target, spinnerIdPrefix),
        outer = Object.create(proxy);
      methods.forEach(method => {
        outer[method] = proxy._call.bind(proxy, method);
        outer.hasMethod = methodName => proxy._hasMethod(methodName);
      });
      return outer;
    },
  };
}

//-----------------------------------------------------------------------------
export default mqttRpcServiceModule;
