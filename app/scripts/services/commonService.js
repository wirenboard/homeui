'use strict';

angular.module('homeuiApp.commonServiceModule', [])
  .factory('CommonСode', ['$rootScope', '$location', '$window', 'mqttClient', 'HomeUIData', function ($rootScope, $location, $window, mqttClient, HomeUIData){
    var commonCode = {};

    commonCode.loginData = {};
    commonCode.loginData.host = 'mqtt.carbonfay.ru';
    commonCode.loginData.port = 18883;
    commonCode.tryConnect = commonCode.tryConnect;
    commonCode.disconnect = commonCode.disconnect;
    commonCode.connected = $window.localStorage['connected'];
    commonCode.data = HomeUIData.list();

    commonCode.tryConnect = function() {
      console.log('Try to connect as ' + commonCode.loginData.user);
      if(commonCode.loginData.host && commonCode.loginData.port){
        $window.localStorage.setItem('host',commonCode.loginData.host);
        $window.localStorage.setItem('port',commonCode.loginData.port);
        $window.localStorage.setItem('user',commonCode.loginData.user);
        $window.localStorage.setItem('password',commonCode.loginData.password);
        mqttClient.connect(commonCode.loginData.host, commonCode.loginData.port, commonCode.loginData.user, commonCode.loginData.password);
        console.log('Successfully logged in ' + commonCode.loginData.user);
      }else{
        commonCode.showAlert();
      }
    };

    $rootScope.change = function(control) {
      console.log('changed: ' + control.name + ' value: ' + control.value);
      var payload = control.value;
      if(control.metaType == 'switch' && (control.value === true || control.value === false)){
        payload = control.value ? '1' : '0';
      }
      mqttClient.send(control.topic, payload);
    };

    commonCode.disconnect = function() {
      mqttClient.disconnect();
      $window.localStorage.clear();
      $location.path('/home');
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

      if(backTo) $location.path(backTo).search({created: true});
    };

    return commonCode;
  }]);
