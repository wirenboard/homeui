angular.module('homeuiApp.fakeMqtt', ["homeuiApp.mqttServiceModule"])
  .factory("mqttBroker", function ($rootScope, $timeout, topicMatches) {
    var clientMap = Object.create(null),
        subscriptionMap = Object.create(null);

    function spread(msg) {
      var clients = [];
      Object.keys(subscriptionMap).sort().forEach(function (pattern) {
        if (!topicMatches(pattern, msg.topic))
          return;
        subscriptionMap[pattern].forEach(function (client) {
          if (clients.indexOf(client) < 0)
            clients.push(client);
        });
      });
      clients.forEach(function (client) { client._receive(msg); });
    }

    function Client() {
      this.connected = false;
    }

    Client.prototype.getID = function getID () { // FIXME: add this to the real mqttService
      return this.clientid;
    };

    Client.prototype.connect = function (host, port, clientid, user, password) {
      if (this.connected)
        throw new Error("already connected");
      if (!clientid)
        throw new Error("bad or unspecified clientid");
      if (clientMap[clientid])
        throw new Error("clientid already in use");
      this.clientid = clientid;
      this.connected = true;
      this.callbackMap = Object.create(null); // TBD: add global callback
      clientMap[clientid] = this;
      $timeout(function () { $rootScope.$digest(); });
    };

    Client.prototype.disconnect = function disconnect () {
      if (!this.connected)
        return;
      this.connected = false;
      this.callbackMap = Object.create(null);
      for (var topic in subscriptionMap) {
        if (subscriptionMap[topic].indexOf(this) >= 0)
          subscriptionMap[topic] = subscriptionMap[topic].filter(function (client) {
            return client != this;
          });
      }
      delete clientMap[this.clientid];
      $timeout(function () { $rootScope.$digest(); });
    };

    Client.prototype.isConnected = function isConnected () {
      return this.connected;
    };

    Client.prototype._receive = function _receive (msg) {
      Object.keys(this.callbackMap).sort().forEach(function (pattern) {
        if (!topicMatches(pattern, msg.topic))
          return;
        this.callbackMap[pattern].forEach(function (callback) {
          callback(msg);
        });
      }, this);
    };

    Client.prototype.subscribe = function subscribe (topic, callback) {
      var l = subscriptionMap[topic];
      if (!l)
        subscriptionMap[topic] = [ this ];
      else if (l.indexOf(this) < 0)
        l.push(this);
      this.callbackMap[topic] = (this.callbackMap[topic] || []).concat([callback]);
    };

    Client.prototype.unsubscribe = function unsubscribe (topic) {
      if (!subscriptionMap[topic])
        return;
      subscriptionMap[topic] = subscriptionMap[topic].filter(function (client) {
        return client != this;
      }, this);
      delete this.callbackMap[topic];
    };

    Client.prototype.send = function(topic, payload, retained, qos) {
      if (retained === undefined)
        retained = true; // FIXME: that's counterintuitive behavior
      if (qos === undefined)
        qos = 1; // FIXME: use QoS 1 globally
      spread({
        topic: topic,
        payload: payload,
        retained: retained,
        qos: qos
      });
    };

    return {
      createClient: function () {
        return new Client();
      }
    };
  })

  .factory("mqttClient", function ($rootScope, mqttBroker) {
    return mqttBroker.createClient();
  })

  .factory("FakeMqttFixture", function ($rootScope, mqttBroker, mqttClient, $timeout, whenMqttReady) {
    var journal = [];
    return {
      $rootScope: $rootScope,
      $timeout: $timeout,
      broker: mqttBroker,
      mqttClient: mqttClient,
      extClient: mqttBroker.createClient(),
      whenMqttReady: whenMqttReady,
      useJSON: false,
      connect: function () {
        this.extClient.connect("localhost", 1883, "extclient", "", "");
        this.mqttClient.connect("localhost", 1883, "ui", "", "");
        $timeout.flush();
      },
      msgLogger: function (title) {
        return function (msg) {
          var p = msg.payload;
          if (this.useJSON)
            p = "-";
          journal.push(title + ": " + msg.topic + ": [" + p + "] (QoS " + msg.qos +
                       (msg.retained ? ", retained)" : ")"));
          if (this.useJSON)
            journal.push(JSON.parse(msg.payload));
        }.bind(this);
      },
      expectJournal: function () {
        var r = journal;
        journal = [];
        return expect(r);
      }
    };
  });
