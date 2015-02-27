var mqttServiceModule = angular.module('homeuiApp.mqttServiceModule', ['ngResource']);

mqttServiceModule.factory('mqttClient', function($rootScope) {
  var service = {};
  var client = {};

  service.connect = function(host, port, user, password) {
    var options = {
      onSuccess: service.onConnect,
      onFailure: service.onFailure
    };

    if(user != undefined && password != undefined) {
      options.userName = user;
      options.password = password;
    }

    console.log("Try to connect to MQTT Broker on " + host + ":" + port + " with user " + user);

    client = new Paho.MQTT.Client(host, parseInt(port), '/', 'Contactless web ui');
    client.connect(options);

    client.onConnectionLost = service.onConnectionLost;
    client.onMessageDelivered = service.onMessageDelivered;
    client.onMessageArrived = service.onMessageArrived;
  };

  service.onConnect = function() {
    console.log("Connected to " + client.host + ":" + client.port + " as '" + client.clientId + "'");
    client.subscribe("/devices/#");
  };

  service.onFailure = function() {
    console.log("Failure to connect to " + client.host + ":" + client.port + " as " + client.clientId);
  };

  service.publish = function(topic, payload) {
    client.publish(topic, payload, {retain: true});
    console.log('publish-Event sent '+ payload + ' with topic: ' + topic + ' ' + client);
  };

  service.onMessage = function(callback) {
    service.callback = callback;
  };

  service.onConnectionLost = function (errorCallback) {
    console.log("Server connection lost: " + errorCallback.errorMessage);
  };

  service.onMessageDelivered = function(message) {
    console.log("Delivered message: " + JSON.stringify(message));
  };

  service.onMessageArrived = function(message) {
    console.log("Arrived message: " + message.destinationName + " with " + message.payloadBytes.length + " bytes of payload");
    console.log("Message: " + String.fromCharCode.apply(null, message.payloadBytes));
    service.callback(message);
  };

  service.send = function(destination, payload) {
    var message = new Paho.MQTT.Message(payload);
    message.destinationName = destination;

    client.send(message);
  };

  service.disconnect = function() {
    client.disconnect();
  };

  return service;
});