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
    'homeuiApp.MqttRpc',
    'homeuiApp.DumbTemplate',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'toggle-switch',
    'angularSpectrumColorpicker',
    'ngFileUpload',
    'ngOrderObjectBy',
    'ui.bootstrap',
    'ui.codemirror',
    'gridshore.c3js.chart',
    'angular-json-editor'
  ])
  .value("historyMaxPoints", 1000)
  .config(function ($routeProvider, JSONEditorProvider, DumbTemplateProvider) {
    var DumbTemplate = null;
    JSONEditorProvider.configure({
      defaults: {
        options: {
          show_errors: "always",
          template: {
            compile: function (template) {
              if (!DumbTemplate)
                DumbTemplate = DumbTemplateProvider.$get();
              return DumbTemplate.compile(template);
            }
          }
          // iconlib: 'bootstrap3',
          // theme: 'bootstrap3',
        }
      }
    });
    $routeProvider
      .when('/', {
        templateUrl: 'views/home.html',
        controller: 'HomeCtrl'
      })
      .when('/login/:id',{
        templateUrl: 'views/login.html',
        controller: 'LoginCtrl'
      })
      .when('/configs/edit/:path*', {
        templateUrl: 'views/config.html',
        controller: 'ConfigCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .run(['$rootScope', '$location', 'mqttClient', function ($rootScope, $location, mqttClient){
    $rootScope.objectsKeys = function(collection){
      return Object.keys(collection);
    };
    $rootScope.$on( "$locationChangeStart", function(event, next, current) {
      if(current.split('/').pop() != 'edit' && current.split('/').pop() != 'new') $rootScope.showCreated = false;
      $rootScope.refererLocation = current;
    });
  }]);
