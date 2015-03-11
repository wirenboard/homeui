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
    'homeuiApp.dataServiceModule',
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
      .when('/rooms', {
        templateUrl: 'views/rooms.html',
        controller: 'RoomCtrl'
      })
      .when('/widgets', {
        templateUrl: 'views/widgets.html',
        controller: 'WidgetCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
