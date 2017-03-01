// Import slylesheets
import 'bootstrap/dist/css/bootstrap.css';
import '../styles/main.css';
import 'spectrum-colorpicker/spectrum.css';
import 'ui-select/dist/select.css';

// Angular packages
import angular from 'angular';
import ngRoute from 'angular-route';
import ngResource from 'angular-resource';
import ngSanitize from 'angular-sanitize';
import ngTouch from 'angular-touch';
import uiSelect from 'ui-select';

import 'bootstrap';

import 'spectrum-colorpicker';
import '../bower_components/angular-spectrum-colorpicker/dist/angular-spectrum-colorpicker';

// homeui modules
import errorsService from './services/errors';
import mqttServiceModule from './services/mqttService';
import editorProxyService from './services/editorProxy';
import configEditorProxyService from './services/configEditorProxy';
import historyProxyService from './services/historyProxy';
import mqttRpcServiceModule from './services/rpc';
import gotoDefStartService from './services/gotoDefStart';
import getTimeService from './services/time';
import spinnerService from './services/spinner';
import dumbTemplateModule from './services/dumbtemplate';
import pageStateService from './services/pagestate';
import deviceDataService from './services/devicedata';
import uiConfigService from './services/uiconfig';
import hiliteService from './services/hilite';

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

import cellDirective from './directives/cell';
import consoleDirective from './directives/console';
import widgetDirective from './directives/widget';
import transformRgbDirective from './directives/transformrgb';
import alarmCellDirective from './directives/alarmcell';
import valueCellDirective from './directives/valuecell';
import switchCellDirective from './directives/switchcell';
import textCellDirective from './directives/textcell';
import rangeCellDirective from './directives/rangecell';
import buttonCellDirective from './directives/buttoncell';
import {displayCellDirective, displayCellConfig} from './directives/displaycell';
import cellNameDirective from './directives/cellname';
import rgbCellDirective from './directives/rgbcell';
import cellPickerDirective from './directives/cellpicker';
import explicitChangesDirective from './directives/explicitchanges';
import editableElasticTextareaDirective from './directives/editableelastictextarea';

import metaTypeFilterModule from './filters/metaTypeFilter';

import './3rdparty/angular-json-editor'
import './3rdparty/jsoneditor'
import './3rdparty/ui-bootstrap'

import routing from './app.routes.js';

/**
 * @ngdoc overview
 * @name homeuiApp
 * @description
 * # homeuiApp
 *
 * Main module of the application.
 */
let module = angular
  .module('homeuiApp', [
    mqttServiceModule,
    metaTypeFilterModule,
    mqttRpcServiceModule,
    dumbTemplateModule,
    ngResource,
    ngRoute,
    ngSanitize,
    ngTouch,
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
    uiSelect,
    'monospaced.elastic'
  ])
  .value('historyMaxPoints', 1000)
  .value('webuiConfigPath', '/etc/wb-webui.conf')
  .value('configSaveDebounceMs', 300);

// Register services
module
  .factory('errors', errorsService)
  .factory('EditorProxy', editorProxyService)
  .factory('ConfigEditorProxy', configEditorProxyService)
  .factory('HistoryProxy', historyProxyService)
  .factory('gotoDefStart', gotoDefStartService)
  .factory('getTime', getTimeService)
  .factory('Spinner', spinnerService)
  .value('forceBeforeUnloadConfirmationForTests', false)
  .factory('PageState', pageStateService)
  .factory('DeviceData', deviceDataService)
  .run(DeviceData => {
    // make sure DeviceData is loaded at the startup so no MQTT messages are missed
  })
  .factory('uiConfig', uiConfigService)
  .filter('hilite', hiliteService);

// Register controllers
module
  .value('AlertDelayMs', 5000)
  .controller('AlertCtrl', AlertCtrl)
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

module
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

module
  .directive('scriptForm', function (PageState) {
    return {
      restrict: 'A',
      link: function (scope, element) {
        var formCtrl = scope[element.attr('name')];
        scope.$watch(element.attr('name') + '.$dirty', function (newValue) {
          PageState.setDirty(newValue);
        });
      }
    };
  })
  .controller('ScriptCtrl', ScriptCtrl);

// Register directives
module
  .directive('cell', cellDirective)
  .value('scrollTimeoutMs', 100)
  .directive('console', consoleDirective)
  .directive('widget', widgetDirective)
  .directive('transformRgb', transformRgbDirective)
  .provider('displayCellConfig', displayCellConfig)
  .directive('displayCell', displayCellDirective)
  .config(displayCellConfigProvider => {
    displayCellConfigProvider.addDisplayType('alarm', 'alarm-cell', true);
  })
  .directive('alarmCell', alarmCellDirective)
  .config(displayCellConfigProvider => {
    displayCellConfigProvider.addDisplayType('value', 'value-cell');
  })
  .directive('valueCell', valueCellDirective)

  .config(displayCellConfigProvider => {
    displayCellConfigProvider.addDisplayType('switch', 'switch-cell');
  })
  .directive('switchCell', switchCellDirective)
  .config(displayCellConfigProvider => {
    displayCellConfigProvider.addDisplayType('text', 'text-cell');
  })
  .directive('textCell', textCellDirective)
  .config(displayCellConfigProvider => {
    displayCellConfigProvider.addDisplayType('range', 'range-cell');
  })
  .directive('rangeCell', rangeCellDirective)
  .config(displayCellConfigProvider => {
    displayCellConfigProvider.addDisplayType('button', 'button-cell', true);
  })
  .directive('buttonCell', buttonCellDirective)
  .directive('cellName', cellNameDirective)
  .value('rgbLocalStorageKey', 'cell_rgb_palette')
  .config(displayCellConfigProvider => {
    displayCellConfigProvider.addDisplayType('rgb', 'rgb-cell');
  })
  .directive('rgbCell',rgbCellDirective)
  .directive('cellPicker', cellPickerDirective)
  .directive('explicitChanges', explicitChangesDirective)
  .directive('editableElasticTextarea', editableElasticTextareaDirective);

// Set up routing
module
  .config(routing)
  .run(($rootScope, $location) => {
    $rootScope.objectsKeys = function(collection){
      return Object.keys(collection);
    };
    $rootScope.$on('$locationChangeStart', function(event, next, current) {
      if(current.split('/').pop() != 'edit' && current.split('/').pop() != 'new') $rootScope.showCreated = false;
      $rootScope.refererLocation = current;
    });
  });

// Register wrapper module
angular.module('realHomeuiApp', [module.name])
  .run(($rootScope, $window, mqttClient, ConfigEditorProxy, webuiConfigPath, errors, whenMqttReady, uiConfig, $timeout, configSaveDebounceMs) => {
    // TBD: the following should be handled by config sync service
    var configSaveDebounce = null;
    // TBD: loginService
    function randomString (length) {
      var text = '';
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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
      alert('Please specify connection data in Settings');
      return;
    }

    whenMqttReady()
      .then(() => ConfigEditorProxy.Load({ path: webuiConfigPath }))
      .then((r) => {
        console.log('LOAD CONF: %o', r.content);
        uiConfig.ready(r.content);
        $rootScope.$watch(() => uiConfig.filtered(), (newData, oldData) => {
          if (angular.equals(newData, oldData))
            return;
          console.log('new data: %o', newData);
          if (configSaveDebounce)
            $timeout.cancel(configSaveDebounce);
          configSaveDebounce = $timeout(() => {
            ConfigEditorProxy.Save({ path: webuiConfigPath, content: newData }).then(() => {
              console.log('config saved');
            });
          }, configSaveDebounceMs);
        }, true);
      }).catch(errors.catch('Error loading WebUI config'));
  });
