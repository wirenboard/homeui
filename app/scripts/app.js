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
      .when('/widgets/new', {
        templateUrl: 'views/new_widget.html',
        controller: 'WidgetCtrl'
      })
      .when('/widget_templates', {
        templateUrl: 'views/widget_templates.html',
        controller: 'WidgetTemplateCtrl'
      })
      .when('/widget_templates/new', {
        templateUrl: 'views/new_widget_template.html',
        controller: 'WidgetTemplateCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .run(function($rootScope, mqttClient) {
    $rootScope.objectsKeys = function(collection){
      return Object.keys(collection);
    }
    $rootScope.mqttSendCollection = function(topic, collection){
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
    }
  });
