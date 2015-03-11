'use strict';

angular.module('homeuiApp')
  .controller('HomeuiCtrl', ['$scope', '$location', '$window', 'mqttClient', function ($scope, $location, $window, mqttClient){
    $scope.loginData = {};
    $scope.loginData.host = 'mqtt.carbonfay.ru';
    $scope.loginData.port = 18883;
    $scope.tryConnect = tryConnect;
    $scope.disconnect = disconnect;
    $scope.connected = $window.localStorage['connected'];

    function tryConnect() {
      console.log('Try to connect as ' + $scope.loginData.user);
      if($scope.loginData.host && $scope.loginData.port){
        $window.localStorage.setItem('host',$scope.loginData.host);
        $window.localStorage.setItem('port',$scope.loginData.port);
        $window.localStorage.setItem('user',$scope.loginData.user);
        $window.localStorage.setItem('password',$scope.loginData.password);
        mqttClient.connect($scope.loginData.host, $scope.loginData.port, $scope.loginData.user, $scope.loginData.password);
        console.log('Successfully logged in ' + $scope.loginData.user);
        $location.path('/devices');
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
      if(!$scope.connected){
        $scope.tryConnect();
      }
    });

    mqttClient.onMessage(function(message) {
      console.log('Catch onMessage callback');
    });
  }]);
