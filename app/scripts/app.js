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
    'angular-c3-simple',
    'angular-json-editor',
    'angular-sortable-view',
    'xeditable',
    'ui.select',
    'monospaced.elastic'
  ])
  .value("historyMaxPoints", 1000)
  .value("webuiConfigPath", "/etc/wb-webui.conf")
  .value("configSaveDebounceMs", 300)
  .config(($routeProvider, JSONEditorProvider, DumbTemplateProvider) => {
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
      .when('/devices', {
        templateUrl: 'views/devices.html',
        controller: 'DevicesCtrl'
      })
      .when('/widgets', {
        templateUrl: 'views/widgets.html',
        controller: 'WidgetsCtrl'
      })
      .when('/dashboards', {
        templateUrl: 'views/dashboards.html',
        controller: 'DashboardsCtrl'
      })
      .when('/dashboards/:id', {
        templateUrl: 'views/dashboard.html',
        controller: 'DashboardCtrl'
      })
      .when('/settings', {
        templateUrl: 'views/settings.html',
        controller: 'SettingCtrl'
      })
      .when('/login/:id',{
        templateUrl: 'views/login.html',
        controller: 'LoginCtrl'
      })
      .when('/scripts', {
        templateUrl: 'views/scripts.html',
        controller: 'ScriptsCtrl'
      })
      .when('/scripts/edit/:path*', {
        templateUrl: 'views/script.html',
        controller: 'ScriptCtrl'
      })
      .when('/scripts/new', {
        templateUrl: 'views/script.html',
        controller: 'ScriptCtrl'
      })
      .when('/history', {
        templateUrl: 'views/history.html',
        controller: 'HistoryCtrl'
      })
      .when('/history/:device/:control/:start/:end', {
        templateUrl: 'views/history.html',
        controller: 'HistoryCtrl'
      })
      .when('/configs', {
        templateUrl: 'views/configs.html',
        controller: 'ConfigsCtrl'
      })
      .when('/configs/edit/:path*', {
        templateUrl: 'views/config.html',
        controller: 'ConfigCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .run(($rootScope, $location) => {
    $rootScope.objectsKeys = function(collection){
      return Object.keys(collection);
    };
    $rootScope.$on("$locationChangeStart", function(event, next, current) {
      if(current.split('/').pop() != 'edit' && current.split('/').pop() != 'new') $rootScope.showCreated = false;
      $rootScope.refererLocation = current;
    });
  });

angular.module("realHomeuiApp", ["homeuiApp"])
  .run(($rootScope, ConfigEditorProxy, webuiConfigPath, errors, whenMqttReady, uiConfig, $timeout, configSaveDebounceMs) => {
    // TBD: the following should be handled by config sync service
    var configSaveDebounce = null;
    whenMqttReady()
      .then(() => ConfigEditorProxy.Load({ path: webuiConfigPath }))
      .then((r) => {
        console.log("LOAD CONF: %o", r.content);
        uiConfig.ready(r.content);
        $rootScope.$watch(() => uiConfig.filtered(), (newData, oldData) => {
          if (angular.equals(newData, oldData))
            return;
          console.log("new data: %o", newData);
          if (configSaveDebounce)
            $timeout.cancel(configSaveDebounce);
          configSaveDebounce = $timeout(() => {
            ConfigEditorProxy.Save({ path: webuiConfigPath, content: newData }).then(() => {
              console.log("config saved");
            });
          }, configSaveDebounceMs);
        }, true);
      }).catch(errors.catch("Error loading WebUI config"));
  });
