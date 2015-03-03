'use strict';

/**
 * @ngdoc overview
 * @name homeuiApp
 * @description
 * # homeuiApp
 *
 * Main module of the application.
 */
angular
  .module('homeuiApp', [
    'homeuiApp.mqttServiceModule',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'toggle-switch'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/home.html',
        controller: 'HomeuiCtrl',
        controllerAs: 'homeui'
      })
      .when('/devices', {
        templateUrl: 'views/devices.html',
        controller: 'DeviceCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .run(function($rootScope, $location, $window, mqttClient) {
    var host = $window.localStorage['host'];
    var port = $window.localStorage['port'];
    var user = $window.localStorage['user'];
    var password = $window.localStorage['password'];
    console.log("Verifying User Session..." + user);
    if(host == null && port == null){
      console.log('Going to login');
      $location.path('/');
    }else{
      console.log('Going to devices');
      try {
        mqttClient.connect(host, port, user, password);
        $location.path('/devices');
      } catch(e) {
        console.log(e.toString());
      }
    }
  });
