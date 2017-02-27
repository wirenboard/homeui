// Import slylesheets
import 'bootstrap/dist/css/bootstrap.css';
import '../styles/main.css';
import 'spectrum-colorpicker/spectrum.css';

// Angular packages
import angular from 'angular';

import 'bootstrap';

// homeui modules
import AlertCtrl from './controllers/alertController';
import HomeCtrl from './controllers/homeController';
import DashboardsCtrl from './controllers/dashboardsController';
import DashboardCtrl from './controllers/dashboardController';
import DevicesCtrl from './controllers/devicesController';
import WidgetsCtrl from './controllers/widgetsController';
import HistoryCtrl from './controllers/historyController';
import ScriptsCtrl from './controllers/scriptsController';
import ScriptCtrl from './controllers/scriptController';
import ConfigsCtrl from './controllers/configsController';
import ConfigCtrl from './controllers/configController';
import SettingCtrl from './controllers/settingController';
import NavigationCtrl from './controllers/navigationController';
import LoginCtrl from './controllers/loginController';
import FirmwareCtrl from './controllers/firmwareController';

import routing from './app.routes.js'

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
  .value("configSaveDebounceMs", 300);

// Register controllers
angular.module("homeuiApp")
  .value("AlertDelayMs", 5000)
  .controller("AlertCtrl", AlertCtrl)
  .controller('HomeCtrl', HomeCtrl)
  .controller('DashboardsCtrl', DashboardsCtrl)
  .controller('DashboardCtrl', DashboardCtrl)
  .controller('DevicesCtrl', DevicesCtrl)
  .controller('WidgetsCtrl', WidgetsCtrl)
  .controller('HistoryCtrl', HistoryCtrl)
  .controller('ScriptsCtrl', ScriptsCtrl)
  .controller('ConfigsCtrl', ConfigsCtrl)
  .controller('ConfigCtrl', ConfigCtrl)
  .controller('FirmwareCtrl', FirmwareCtrl)
  .controller('SettingCtrl', SettingCtrl)
  .controller('LoginCtrl', LoginCtrl);

angular.module('homeuiApp')
  .controller('NavigationCtrl', NavigationCtrl)
  .directive('widgetMenuItem', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/menu-item.html'
    };
  })
  .directive('widgetTemplateMenuItem', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/template-menu-item.html'
    };
  });

angular.module("homeuiApp")
  .directive("scriptForm", function (PageState) {
    return {
      restrict: "A",
      link: function (scope, element) {
        var formCtrl = scope[element.attr("name")];
        scope.$watch(element.attr("name") + ".$dirty", function (newValue) {
          PageState.setDirty(newValue);
        });
      }
    };
  })
  .controller("ScriptCtrl", ScriptCtrl);

angular
  .module('homeuiApp')
  .config(routing)
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
  .run(($rootScope, $window, mqttClient, ConfigEditorProxy, webuiConfigPath, errors, whenMqttReady, uiConfig, $timeout, configSaveDebounceMs) => {
    // TBD: the following should be handled by config sync service
    var configSaveDebounce = null;
    // TBD: loginService
    function randomString (length) {
      var text = "";
      var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for (var i = 0; i < length; i++)
        text += chars.charAt(Math.floor(Math.random() * chars.length));
      return text;
    }

    var loginData = {
      host: $window.localStorage['host'],
      port: $window.localStorage['port'],
      user: $window.localStorage['user'],
      password: $window.localStorage['password'],
      prefix: $window.localStorage['prefix']
    };

    if (loginData.host && loginData.port) {
      var clientID = 'contactless-' + randomString(10);
      console.log('Try to connect as ' + clientID);
      mqttClient.connect(loginData.host, loginData.port, clientID, loginData.user, loginData.password);
      console.log('Successfully logged in ' + clientID);
    } else {
      alert("Please specify connection data in Settings");
      return;
    }

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
