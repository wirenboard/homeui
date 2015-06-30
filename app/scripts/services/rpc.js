"use strict";

angular.module("homeuiApp.MqttRpc", ["homeuiApp.mqttServiceModule"])
  .factory("MqttRpc", ["mqttClient", "$q", "$rootScope", function (mqttClient, $q, $rootScope) {
    var disconnectedError = {
      data: "MqttConnectionError",
      message: "MQTT client is not connected"
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
      mqttClient.subscribe(
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

    Proxy.prototype._handleDisconnection = function _handleDisconnection () {
      Object.keys(this._inflight).sort().forEach(function (callId) {
        this._inflight[callId](null, {
          error: disconnectedError
        });
      }, this);
      this._inflight = {};
      this._maybeStopWatching();
    };

    Proxy.prototype._maybeStopWatching = function _maybeStopWatching () {
      if (Object.keys(this._inflight).length || !this._watchStopper)
        return;
      this._watchStopper();
      this._watchStopper = null;
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
        this._inflight[callId] = function (actualTopic, reply) {
          // console.log("reply: %o", reply);
          if (actualTopic !== null && actualTopic != topic + "/reply")
            reject("unexpected response topic " + actualTopic);
          else if (reply.hasOwnProperty("error")) {
            reject(reply.error);
          } else {
            resolve(reply.result);
          }
        };
      }.bind(this));
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
      var id = parsed.id;
      try {
        this._inflight[id](msg.topic, parsed);
      } finally {
        delete this._inflight[id];
        this._maybeStopWatching();
      }
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
  }]);
