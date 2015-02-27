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
    'ngTouch'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/home.html',
        controller: 'HomeuiCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .run(function($rootScope, $location, $window, mqttClient) {
    // var host = $window.localStorage['host'];
    // var port = $window.localStorage['port'];
    var host = 'mqtt.carbonfay.ru'
    var port = 18883;
    var user = $window.localStorage['user'];
    var password = $window.localStorage['password'];
    console.log("Verifying User Session..." + user);
    if(host == null && port == null){
        console.log('Going to login');
        $location.path('/login');
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
