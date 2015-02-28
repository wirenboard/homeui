'use strict';

/**
 * @ngdoc function
 * @name homeuiApp.controller:HomeuiCtrl
 * @description
 * # HomeuiCtrl
 * Controller of the homeuiApp
 */
angular.module('homeuiApp')
  .controller('HomeuiCtrl', ['$location', '$window', 'mqttClient', function ($location, $window, mqttClient){
    var vm = this;
    vm.loginData = {};
    vm.loginData.host = 'mqtt.carbonfay.ru';
    vm.loginData.port = 18883;
    vm.tryConnect = tryConnect;
    vm.disconnect = disconnect;
    vm.connected = $window.localStorage['connected'];

    function tryConnect() {
      console.log('Try to connect as ' + vm.loginData.user);
      if(vm.loginData.host && vm.loginData.port){
        $window.localStorage.setItem('host',vm.loginData.host);
        $window.localStorage.setItem('port',vm.loginData.port);
        $window.localStorage.setItem('user',vm.loginData.user);
        $window.localStorage.setItem('password',vm.loginData.password);
        mqttClient.connect(vm.loginData.host, vm.loginData.port, vm.loginData.user, vm.loginData.password);
        console.log('Successfully logged in ' + vm.loginData.user);
        $location.path('/devices');
        vm.connected = $window.localStorage.setItem('connected', true);
      }else{
        vm.showAlert();
      }
    };

    function disconnect() {
      mqttClient.disconnect();
      $window.localStorage.clear();
      $location.path('/home');
    };
  }]);
