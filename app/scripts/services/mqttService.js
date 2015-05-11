'use strict';

var mqttServiceModule = angular.module('homeuiApp.mqttServiceModule', ['ngResource']);

mqttServiceModule.factory('mqttClient', function($window, $rootScope) {
  var globalPrefix = '';
  var service = {};
  var client = {};
  var connected = false;
  if($window.localStorage['prefix'] === 'true') globalPrefix = '/client/' + $window.localStorage['user'];

  service.connect = function(host, port, clientid, user, password) {
    var options = {
      onSuccess: service.onConnect,
      onFailure: service.onFailure
    };

    if(user != undefined && password != undefined) {
      options.userName = user;
      options.password = password;
    }

    console.log("Try to connect to MQTT Broker on " + host + ":" + port + " with username " + user + " and clientid " + clientid);

    client = new Paho.MQTT.Client(host, parseInt(port), '/', clientid);
    client.connect(options);

    client.onConnectionLost = service.onConnectionLost;
    client.onMessageDelivered = service.onMessageDelivered;
    client.onMessageArrived = service.onMessageArrived;
  };

  service.onConnect = function() {
    console.log("Connected to " + client.host + ":" + client.port + " as '" + client.clientId + "'");
    if(globalPrefix != '') console.log('With globalPrefix: ' + globalPrefix);
    client.subscribe(globalPrefix + "/devices/#");
    //~ client.subscribe(globalPrefix + "/config/#");
    client.subscribe(globalPrefix + "/config/default_dashboard/#");
    client.subscribe(globalPrefix + "/config/rooms/#");
    client.subscribe(globalPrefix + "/config/widgets/#");
    client.subscribe(globalPrefix + "/config/dashboards/#");

    connected = true;
    $rootScope.$digest();
  };

  service.onFailure = function() {
    console.log("Failure to connect to " + client.host + ":" + client.port + " as " + client.clientId);
    connected = false;
    $rootScope.$digest();
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
    connected = false;
    $rootScope.$digest();
  };

  service.onMessageDelivered = function(message) {
    console.log("Delivered message: " + JSON.stringify(message));
  };

  service.onMessageArrived = function(message) {
    // console.log("Arrived message: " + message.destinationName + " with " + message.payloadBytes.length + " bytes of payload");
    // console.log("Message: " + String.fromCharCode.apply(null, message.payloadBytes));
    service.callback(message);
  };

  service.send = function(destination, payload, retained) {
    var topic = globalPrefix + destination;
    if (payload == null) {
		payload = new ArrayBuffer();
	}
    var message = new Paho.MQTT.Message(payload);
    message.destinationName = topic;

    if (retained != undefined) {
		message.retained = retained;
	} else {
	    message.retained = true;
	}

    client.send(message);
  };

  service.disconnect = function() {
    client.disconnect();
  };

  service.isConnected = function () {
    return connected;
  };
  return service;
});
