"use strict";

angular.module("homeuiApp.MqttRpc", ["homeuiApp.mqttServiceModule"])
  .value("mqttRpcTimeout", 15000)
  .factory("MqttRpc", function ($q, $rootScope, $timeout, mqttClient, mqttRpcTimeout) {
    var disconnectedError = {
      data: "MqttConnectionError",
      message: "MQTT client is not connected"
    };
    var timeoutError = {
      data: "MqttTimeoutError",
      message: "MQTT RPC request timed out"
    };

    function Proxy(target, methods) {
      this._prefix = "/rpc/v1/" + target + "/";
      this._inflight = {};
      this._nextId = 1;
      this._watchStopper = null;
    }

    Proxy.prototype._init = function _init () {
      if (this._nextId > 1)
        return;
      // first time
      mqttClient.addStickySubscription(
        this._prefix + "+/" + mqttClient.getID() + "/reply",
        this._handleMessage.bind(this));
    };

    Proxy.prototype._maybeStartWatching = function _maybeStartWatching () {
      if (this._watchStopper !== null)
        return;
      this._watchStopper = $rootScope.$watch(
        function () { return mqttClient.isConnected(); },
        function (connected) {
          if (!connected)
            this._handleDisconnection();
        }.bind(this));
    };

    Proxy.prototype._maybeStopWatching = function _maybeStopWatching () {
      if (Object.keys(this._inflight).length || !this._watchStopper)
        return;
      this._watchStopper();
      this._watchStopper = null;
    };

    Proxy.prototype._handleDisconnection = function _handleDisconnection () {
      Object.keys(this._inflight).sort().forEach(function (callId) {
        this._invokeResponseHandler(callId, null, {
          error: disconnectedError
        });
      }, this);
      if (Object.keys(this._inflight).length)
        throw new Error("Proxy._handleDisconnection(): pending requests remained");
      this._maybeStopWatching();
    };

    Proxy.prototype._call = function _call (method, params) {
      this._init();
      this._maybeStartWatching();
      return $q(function (resolve, reject) {
        if (!mqttClient.isConnected()) {
          reject(disconnectedError);
          return;
        }
        var callId = this._nextId++;
        var topic = this._prefix + method + "/" + mqttClient.getID();
        mqttClient.send(
          topic,
          JSON.stringify({
            id: callId,
            params: params || {}
          }),
          false);
        var timeout = $timeout(this._invokeResponseHandler.bind(this, callId, null, {
          error: timeoutError
        }), mqttRpcTimeout);
        this._inflight[callId] = function onResponse (actualTopic, reply) {
          // console.log("reply: %o", reply);
          $timeout.cancel(timeout);
          if (actualTopic !== null && actualTopic != topic + "/reply")
            reject("unexpected response topic " + actualTopic);
          else if (reply.hasOwnProperty("error") && reply.error !== null)
            reject(reply.error);
          else
            resolve(reply.result);
        }.bind(this);
      }.bind(this));
    };

    Proxy.prototype._invokeResponseHandler = function _invokeResponseHandler (id, topic, reply) {
      try {
        this._inflight[id](topic, reply);
      } finally {
        delete this._inflight[id];
        this._maybeStopWatching();
      }
    };

    Proxy.prototype._handleMessage = function _handleMessage (msg) {
      try {
        var parsed = JSON.parse(msg.payload);
      } catch (e) {
        console.error("cannot parse MQTT RPC response: %o", msg);
        return;
      }
      if (!parsed.hasOwnProperty("id")) {
        console.error("MQTT response without id: %o", msg);
        return;
      }
      if (!this._inflight.hasOwnProperty(parsed.id)) {
        console.error("MQTT response with unexpected id: %o", msg);
        return;
      }
      this._invokeResponseHandler(parsed.id, msg.topic, parsed);
    };

    return {
      getProxy: function (target, methods) {
        var proxy = new Proxy(target),
            outer = Object.create(proxy);
        methods.forEach(function (method) {
          outer[method] = proxy._call.bind(proxy, method);
        });
        return outer;
      }
    };
  });
