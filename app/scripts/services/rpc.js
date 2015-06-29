"use strict";

angular.module("homeuiApp.MqttRpc", ["homeuiApp.mqttServiceModule"])
  .factory("MqttRpc", function (mqttClient, $q) {
    function Proxy(target, methods) {
      this._prefix = "/rpc/v1/" + target + "/";
      this._inflight = {};
      this._nextId = 1;
    }

    Proxy.prototype._init = function _init () {
      if (this._nextId > 1)
        return
      // first time
      mqttClient.subscribe(
        this._prefix + "+/" + mqttClient.getID() + "/reply",
        this._handleMessage.bind(this));
    }

    Proxy.prototype._call = function _call (method, params) {
      this._init();
      return $q(function (resolve, reject) {
        if (!mqttClient.isConnected()) {
          reject("not connected");
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
          // TBD: handle errors
          if (actualTopic != topic + "/reply")
            reject("unexpected response topic " + actualTopic);
          else
            resolve(reply.result);
        };
      }.bind(this));
    }

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
      this._inflight[parsed.id](msg.topic, parsed);
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
