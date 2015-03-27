'use strict';

angular.module('homeuiApp.commonServiceModule', [])
  .factory('CommonСode', ['$rootScope', '$location', '$window', '$routeParams', 'mqttClient', 'HomeUIData', function ($rootScope, $location, $window, $routeParams, mqttClient, HomeUIData){
    var commonCode = {};

    commonCode.tryConnect = commonCode.tryConnect;
    commonCode.disconnect = commonCode.disconnect;
    commonCode.connected = $window.localStorage['connected'];
    commonCode.data = HomeUIData.list();

    commonCode.tryConnect = function() {
      commonCode.loginData = {};
      commonCode.loginData.host = $window.localStorage['host'];
      commonCode.loginData.port = $window.localStorage['port'];
      commonCode.loginData.user = $window.localStorage['user'];
      commonCode.loginData.password = $window.localStorage['password'];
      commonCode.loginData.prefix = $window.localStorage['prefix'];
      if(commonCode.loginData.host && commonCode.loginData.port){
        var userID = commonCode.loginData.user ? commonCode.loginData.user : 'contactless';
        console.log('Try to connect as ' + userID);
        mqttClient.connect(commonCode.loginData.host, commonCode.loginData.port, userID, commonCode.loginData.password);
        console.log('Successfully logged in ' + userID);
      }else{
        alert('Вам нужно перейти в настройки и заполнить данные для входа');
      };
    };

    $rootScope.change = function(control) {
      console.log('changed: ' + control.name + ' value: ' + control.value);
      var payload = control.value;
      if(control.metaType == 'switch' && (control.value === true || control.value === false)){
        payload = control.value ? '1' : '0';
      }
      payload = payload + '/on';
      mqttClient.send(control.topic, payload);
    };

    commonCode.disconnect = function() {
      mqttClient.disconnect();
    };

    $rootScope.$watch('$viewContentLoaded', function(){
      commonCode.tryConnect();
    });

    mqttClient.onMessage(function(message) {
      HomeUIData.parseMsg(message);
      $rootScope.$apply();
    });

    $rootScope.wookmarkIt = function(){
      var wookmarkOptions = {
        autoResize: true,
        container: $('.wookmark-list'),
        offset: 10
      };

      $(".wookmark-list ul li").wookmark(wookmarkOptions);
    };

    $rootScope.mqttSendCollection = function(topic, collection, backTo){
      for (var key in collection) {
        if (collection.hasOwnProperty(key)) {
          if(typeof collection[key] === "object")
            $rootScope.mqttSendCollection(topic + '/' + key ,collection[key]);
          else{
            console.log(topic + "/" + key + " -> " + collection[key]);
            mqttClient.send(topic + "/" + key, collection[key]);
          }
        };
      };

      $rootScope.showCreated = true;

      if(backTo){
        var currentPath = $location.path().split("#").pop();
        backTo = backTo.split("#").pop();
        if(backTo === currentPath) backTo = '/';
        $location.path(backTo);
      };
    };

    $rootScope.isEmpty = function(collection){
      return angular.equals({}, collection);
    };

    $rootScope.switchOff = function(control){
      mqttClient.send(control.topic, '0/on');
    };

    return commonCode;
  }]);
