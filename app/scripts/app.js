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
    'homeuiApp.commonServiceModule',
    'homeuiApp.dataFilters',
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
        controller: 'HomeCtrl'
      })
      .when('/devices', {
        templateUrl: 'views/devices.html',
        controller: 'DeviceCtrl'
      })
      .when('/widgets', {
        templateUrl: 'views/widgets/index.html',
        controller: 'WidgetCtrl'
      })
      .when('/widgets/new', {
        templateUrl: 'views/widgets/form.html',
        controller: 'WidgetCtrl'
      })
      .when('/widget_templates', {
        templateUrl: 'views/widget_templates.html',
        controller: 'WidgetTemplateCtrl'
      })
      .when('/widgets/:id/edit', {
        templateUrl: 'views/widgets/form.html',
        controller: 'WidgetCtrl'
      })
      .when('/rooms', {
        templateUrl: 'views/rooms/index.html',
        controller: 'RoomCtrl'
      })
      .when('/rooms/new', {
        templateUrl: 'views/rooms/form.html',
        controller: 'RoomCtrl'
      })
      .when('/rooms/:id', {
        templateUrl: 'views/rooms/show.html',
        controller: 'RoomCtrl'
      })
      .when('/rooms/:id/edit', {
        templateUrl: 'views/rooms/form.html',
        controller: 'RoomCtrl'
      })
      .when('/dashboards', {
        templateUrl: 'views/dashboards/index.html',
        controller: 'DashboardCtrl'
      })
      .when('/dashboards/new', {
        templateUrl: 'views/dashboards/form.html',
        controller: 'DashboardCtrl'
      })
      .when('/dashboards/:id/edit', {
        templateUrl: 'views/dashboards/form.html',
        controller: 'DashboardCtrl'
      })
      .when('/dashboards/:id', {
        templateUrl: 'views/dashboards/show.html',
        controller: 'DashboardCtrl'
      })
      .when('/settings', {
        templateUrl: 'views/settings.html',
        controller: 'SettingCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .run(['$rootScope', 'mqttClient', function ($rootScope, mqttClient){
    $rootScope.objectsKeys = function(collection){
      return Object.keys(collection);
    };
  }]);
