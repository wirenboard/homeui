angular.module('homeuiApp.fakeMQTT', [])
  .factory("mqttBroker", function ($rootScope, $timeout) {
    var clientMap = Object.create(null),
        subscriptionMap = Object.create(null);

    function topicMatches(pattern, topic) {
      function match (patternParts, topicParts) {
        if (!patternParts.length)
          return !topicParts.length;
        if (patternParts[0] == "#") {
          if (patternParts.length != 1)
            throw new Error("invalid pattern");
          return true;
        }
        if (!topicParts.length)
          return false;
        if (patternParts[0] != "+" && topicParts[0] != patternParts[0])
          return false;
        return match(patternParts.slice(1), topicParts.slice(1));
      }
      return match(pattern.split("/"), topic.split("/"));
    }

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

    Client.prototype.connect = function (host, port, clientid, user, password) {
      if (this.connected)
        throw new Error("already connected");
      if (!clientid)
        throw new Error("bad or unspecified clientid");
      if (clientMap[clientid])
        throw new Error("clientid already in use");
      this.clientid = clientid;
      this.connected = true;
      this.callbackMap = {}; // TBD: add global callback
      clientMap[clientid] = this;
      $timeout(function () { $rootScope.$digest(); });
    }

    Client.prototype.disconnect = function disconnect () {
      throw new Error("not implemented yet"); // must rm itself from clientMap & subscriptionMap
      // FIXME: update the real implementation to call $rootScope.$digest()
      // upon disconnect
      // $timeout(function () { $rootScope.$digest(); });
    }

    Client.prototype.isConnected = function isConnected () {
      return this.connected;
    }

    Client.prototype._receive = function _receive (msg) {
      Object.keys(this.callbackMap).sort().forEach(function (pattern) {
        if (!topicMatches(pattern, msg.topic))
          return;
        this.callbackMap[pattern].forEach(function (callback) {
          callback(msg);
        });
      }, this);
    }

    Client.prototype.subscribe = function subscribe (topic, callback) {
      var l = subscriptionMap[topic];
      if (!l)
        subscriptionMap[topic] = [ this ];
      else if (l.indexOf(this) < 0)
        l.push(this);
      this.callbackMap[topic] = (this.callbackMap[topic] || []).concat([callback]);
    }

    Client.prototype.unsubscribe = function unsubscribe (topic) {
      if (!subscriptionMap[topic])
        return;
      subscriptionMap[topic] = subscriptionMap[topic].filter(function (client) {
        return client != this;
      }, this);
      delete this.callbackMap[topic];
    }

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
    }

    return {
      createClient: function () {
        return new Client();
      }
    }
  })

  .factory("mqttClient", function ($rootScope, mqttBroker) {
    return mqttBroker.createClient();
  })

  .factory("FakeMQTTFixture", function (mqttBroker, mqttClient, $timeout) {
    var journal = [];
    return {
      broker: mqttBroker,
      mqttClient: mqttClient,
      extClient: mqttBroker.createClient(),
      connect: function () {
        this.extClient.connect("localhost", 1883, "extclient", "", "");
        this.mqttClient.connect("localhost", 1883, "ui", "", "");
        $timeout.flush();
      },
      msgLogger: function (title) {
        return function (msg) {
          journal.push(title + ": " + msg.topic + ": [" + msg.payload + "] (QoS " + msg.qos +
                   (msg.retained ? ", retained)" : ")"));
        };
      },
      expectJournal: function () {
        var r = journal;
        journal = [];
        return expect(r);
      }
    }
  });
