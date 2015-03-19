'use strict';

angular.module('homeuiApp')
  .controller('HomeuiCtrl', ['$scope', '$rootScope', '$location', '$window', 'mqttClient', 'HomeUIData', function ($scope, $rootScope, $location, $window, mqttClient, HomeUIData){
    $scope.loginData = {};
    $scope.data = {};
    $scope.loginData.host = 'mqtt.carbonfay.ru';
    $scope.loginData.port = 18883;
    $scope.tryConnect = tryConnect;
    $scope.disconnect = disconnect;
    $scope.connected = $window.localStorage['connected'];
    $scope.data = HomeUIData.list();

    $scope.change = function(control) {
      console.log('changed: ' + control.name + ' value: ' + control.value);
      var payload = control.value;
      if(control.metaType == 'switch' && (control.value === true || control.value === false)){
        payload = control.value ? '1' : '0';
      }
      mqttClient.send(control.topic, payload);
    };

    function tryConnect() {
      console.log('Try to connect as ' + $scope.loginData.user);
      if($scope.loginData.host && $scope.loginData.port){
        $window.localStorage.setItem('host',$scope.loginData.host);
        $window.localStorage.setItem('port',$scope.loginData.port);
        $window.localStorage.setItem('user',$scope.loginData.user);
        $window.localStorage.setItem('password',$scope.loginData.password);
        mqttClient.connect($scope.loginData.host, $scope.loginData.port, $scope.loginData.user, $scope.loginData.password);
        console.log('Successfully logged in ' + $scope.loginData.user);
      }else{
        $scope.showAlert();
      }
    };

    function disconnect() {
      mqttClient.disconnect();
      $window.localStorage.clear();
      $location.path('/home');
    };

    $scope.$watch('$viewContentLoaded', function(){
      $scope.tryConnect();
    });

    mqttClient.onMessage(function(message) {
      HomeUIData.parseMsg(message);
      $scope.$apply();
    });

    $scope.wookmarkIt = function(){
      var wookmarkOptions = {
        autoResize: true,
        container: $('.wookmark-list'),
        offset: 10
      };

      $(".wookmark-list ul li").wookmark(wookmarkOptions);
    };
  }]);
