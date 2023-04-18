// Mosquitto broker setting:
// The maximum number of QoS 1 or 2 messages to hold in the queue (per client)
// above those messages that are currently in flight. Defaults to 100.
const MAX_QUEUED_MESSAGES = 100;

const mqttServiceModule = angular
  .module('homeuiApp.mqttServiceModule', [])
  .factory('whenMqttReady', whenMqttReady)
  .factory('topicMatches', topicMatches)
  .value("mqttConnectTimeout", 15000)
  .value("mqttReconnectDelay", 1500)
  .value("mqttDigestInterval", 250)
  .factory('mqttClient', mqttClient)
  .name;

//-----------------------------------------------------------------------------
function whenMqttReady($q, $rootScope, mqttClient) {
  'ngInject';
  return () => {
    const deferred = $q.defer();

    if (mqttClient.isConnected())
      deferred.resolve();
    else {
      const unwatch = $rootScope.$watch(
        () => mqttClient.isConnected(),
        newValue => {
          if (!newValue) { // Resolve only when connection is established
            return;
          }
          deferred.resolve();
          unwatch();
        });
    }
    return deferred.promise;
  };
}

//-----------------------------------------------------------------------------
function topicMatches() {
  return (pattern, topic) => {
    function match (patternParts, topicParts) {
      if (!patternParts.length)
        return !topicParts.length;
      if (patternParts[0] === "#") {
        if (patternParts.length !== 1)
          throw new Error("invalid pattern");
        return true;
      }
      if (!topicParts.length)
        return false;
      if (patternParts[0] !== "+" && topicParts[0] !== patternParts[0])
        return false;
      return match(patternParts.slice(1), topicParts.slice(1));
    }
    return match(pattern.split("/"), topic.split("/"));
  };
}

//-----------------------------------------------------------------------------
function mqttClient($window, $timeout, $q, topicMatches, mqttConnectTimeout,
                    mqttReconnectDelay, mqttDigestInterval, errors, ngToast, $translate) {
  'ngInject';
  var globalPrefix = '',
      service = {},
      client = {},
      id = '',
      connected = false,
      showConnectError = false,
      connectOptions,
      reconnectTimeout = null,
      callbackMap = Object.create(null),
      stickySubscriptions = [],
      messageDigestTimer = null,
      retainReady = $q.defer(),
      retainIsDone = false,
      retainHackTopic = '';

  if($window.localStorage['prefix'] === 'true')
    globalPrefix = '/client/' + $window.localStorage['user'];

  //...........................................................................
  function reconnectAfterTimeout() {
    if (reconnectTimeout) { // debounce
      $timeout.cancel(reconnectTimeout);
    }
    reconnectTimeout = $timeout(() => {
      console.log("reconnect timer fired");
      reconnectTimeout = null;
      client.connect(angular.copy(connectOptions));
    }, mqttReconnectDelay);
  }

  //...........................................................................
  function clearReconnectTimeout() {
    if (reconnectTimeout !== null)
      $timeout.cancel(reconnectTimeout);
  }

  service.whenReady = function() {
    return retainReady.promise;
  };

  service.isReady = function() {
    return retainIsDone
  };

  // timeout measured after receiving all retained messages
  service.timeout = function(callback, delay) {
    const timeout = $q.defer();
    timeout.promise._defer = timeout;
    timeout.promise.then(callback);
    retainReady.promise.then(() => timeout.promise._timeout = $timeout(timeout.resolve, delay));
    return timeout.promise;
  };

  service.cancel = function(promise) {
    promise._defer.reject();
    retainReady.promise.then(() => $timeout.cancel(promise._timeout));
  };

  //...........................................................................
  service.connect = function(host, port, clientid, user, password) {
    clearReconnectTimeout();

    connectOptions = {
      onSuccess: service.onConnect.bind(service),
      onFailure: service.onFailure.bind(service),
      timeout: mqttConnectTimeout / 1000
    };

    if(user && password) {
      connectOptions.userName = user;
      connectOptions.password = password;
    }

    id = clientid;

    retainIsDone = false;
    retainHackTopic = "/tmp/" + id + "/retain_hack";
    retainReady = $q.defer();

    console.log("Try to connect to MQTT Broker on " + host + ":" + port + " with username " + user + " and clientid " + clientid);

    // Clean up localStorage from old messages
    // Without cleaning localStorage could be filled casing errors in transmission
    var keysToRemove = []
    for ( var key in localStorage) {
      if (key.indexOf('Sent:') == 0 || key.indexOf('Received:') == 0) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => { localStorage.removeItem(key); });

    client = new Paho.MQTT.Client(host, parseInt(port), '/mqtt', clientid);
    client.onConnectionLost = service.onConnectionLost;
    client.onMessageDelivered = service.onMessageDelivered;
    client.onMessageArrived = service.onMessageArrived;

    // in-flight messages - messages with QoS 1 or 2,
    // for which no confirmation message was received from the broker
    client.inFlightMessages = [];
    // list of service.send function calls which will be called
    // when the number of inFlightMessages decreases
    client.unsentMessagesQueue = [];
    // availableSessionCapacity: the number of messages with QoS 1 or 2
    // that can be sent to the broker without exceeding the MAX_QUEUED_MESSAGES limit.
    Object.defineProperty(client, 'availableSessionCapacity', {
      get: () => MAX_QUEUED_MESSAGES - client.inFlightMessages.length,
    });

    client.connect(angular.copy(connectOptions));
  };

  //...........................................................................
  service.getID = function getID () {
    return id;
  };

  //...........................................................................
  service.onConnect = function() {
    // если была показана ошибка соединения то очищаю
    if(showConnectError) errors.hideError();
    if (connected) {
      return;
    }
    connected = true;

    console.log("Connected to " + client.host + ":" + client.port + " as '" + client.clientId + "'");
    if(globalPrefix !== '') console.log('With globalPrefix: ' + globalPrefix);

    client.subscribe(globalPrefix + "/config/widgets/#");
    client.subscribe(globalPrefix + "/config/dashboards/#");

    client.subscribe(globalPrefix + "/devices/#");
    stickySubscriptions.forEach(item => this.subscribe(item.topic, item.callback));

    // prepare retain hack
    client.subscribe(globalPrefix + retainHackTopic);
    var msg = new Paho.MQTT.Message('1');
    msg.destinationName = globalPrefix + retainHackTopic;
    msg.qos = 2;
    client.send(msg);
  };

  //...........................................................................
  service.onFailure = function(context) {
    connected = false;
    // ставлю флаг что ошибка показана чтобы позже при коннекте
    // почистить именно ее а не другую ошибку
    showConnectError = true;
    const params = {
      host: client.host + ":" + client.port
    };
    console.log("Connection failed (" + client.clientId + "): " + context.errorMessage + " (" + context.errorCode + ")");
    ngToast.dismiss();
    $translate('mqtt.errors.connect', params).then(m => ngToast.danger(m));
    reconnectAfterTimeout();
  };

  //...........................................................................
  service.publish = function(topic, payload) {
    if (!connected) {
      // FIXME: should fail hard here
      console.error("can't publish(): disconnected");
      return;
    }
    client.publish(topic, payload, {retain: true});
    console.log('publish-Event sent '+ payload + ' with topic: ' + topic + ' ' + client);
  };

  //...........................................................................
  service.subscribe = function (topic, callback) {
    if (!connected) {
      // FIXME: should fail hard here
      console.error("can't subscribe(): disconnected");
      return;
    }
    // !!! XXX: FIXME !!!
    // { qos: 2 } subscribe option was triggering some bug inside
    // mosquitto that caused MQTT RPC reply subscriptions to be
    // skipped when there were any retained messages to receive.
    // Verified for the case of mosquitto's own MQTT WS bridge.
    client.subscribe(globalPrefix + topic);
    callbackMap[topic] = (callbackMap[topic] || []).concat([callback]);
  };

  //...........................................................................
  service.addStickySubscription = function (topic, callback) {
    stickySubscriptions.push({ topic: topic, callback: callback });
    if (connected)
      this.subscribe(topic, callback);
  };

  // TBD: unsubcribe

  //...........................................................................
  service.onConnectionLost = function (responseObject) {
    connected = false;

    callbackMap = Object.create(null);
    if (responseObject.errorCode !== 0) { // not intentionally disconnected
      console.log("Server connection lost: %o", responseObject);
      reconnectAfterTimeout();
    } else {
      console.log("Successfully disconnected");
    }
  };

  //...........................................................................
  service.onMessageDelivered = function(message) {
    if(message.qos > 0) {
      // trying to find the message in inFlightMessages and remove it
      const messageIndex = client.inFlightMessages.indexOf(message);
      if (messageIndex > -1) {
        client.inFlightMessages.splice(messageIndex, 1);
      }
      // if there are messages waiting to be sent and the capacity
      // of the session available for sending, send as many messages as we can
      if (
        client.unsentMessagesQueue.length &&
        client.availableSessionCapacity > 0
      ) {
        client.unsentMessagesQueue
          .splice(0, client.availableSessionCapacity)
          .forEach(message => {
            const { destination, payload, retained, qos } = message
            service.send(destination, payload, retained, qos)
          })
      }
    }

    console.log("Delivered message: ", JSON.stringify(message));
  };

  //...........................................................................
  service.onMessageArrived = function(message) {
    // console.log("Arrived message: " + message.destinationName + " with " + message.payloadBytes.length + " bytes of payload");
    // console.log("Message: " + String.fromCharCode.apply(null, message.payloadBytes));
    var topic = message.destinationName;

    // check retain hack
    if (!retainIsDone && topic === retainHackTopic) {
      retainIsDone = true;
      retainReady.resolve();
      return;
    }

    if (topic.substring(0, globalPrefix.length) === globalPrefix)
      topic = topic.substring(globalPrefix.length);

    Object.keys(callbackMap).sort().forEach(function (pattern) {
      if (!topicMatches(pattern, topic)) {
        return;
      }
      callbackMap[pattern].forEach(function (callback) {
        callback({
          topic: topic,
          payload: message.payloadString,
          qos: message.qos,
          retained: message.retained
        });
      });
    });
    if (!messageDigestTimer)
      messageDigestTimer = $timeout(() => { messageDigestTimer = null; }, mqttDigestInterval);
  };

  //...........................................................................
  service.send = function(destination, payload, retained, qos) {
    //console.log("service.send",destination, payload, retained, qos);

    if (!connected) {
      // FIXME: should fail hard here
      console.error("can't send(): disconnected");
      return;
    }
    if(qos > 0 && client.availableSessionCapacity < 1) {
      const message = { destination, payload, retained, qos };
      client.unsentMessagesQueue.push(message);
      return
    }

    var topic = globalPrefix + destination;
    if (payload == null) {
      payload = new ArrayBuffer();
    }
    var message = new Paho.MQTT.Message(payload);
    message.destinationName = topic;
    message.qos = qos === undefined ? 1 : qos;
    if (retained !== undefined) {
      message.retained = retained;
    } else {
      message.retained = true;
    }

    client.send(message);

    if(message.qos > 0) {
      client.inFlightMessages.push(message);
    }
  };

  //...........................................................................
  service.disconnect = function() {
    clearReconnectTimeout();
    callbackMap = Object.create(null);
    if (connected) {
      client.disconnect();
    }
  };

  //...........................................................................
  service.isConnected = () => {
    return connected;
  };

  return service;
}

//-----------------------------------------------------------------------------
export default mqttServiceModule;
