// Import slylesheets
import 'bootstrap/dist/css/bootstrap.css';
import '../styles/main.css';
import 'spectrum-colorpicker/spectrum.css';
import 'ui-select/dist/select.css';
import 'c3/c3.css';
import 'angular-xeditable/dist/css/xeditable.css';
import '../lib/css-spinners/css/spinner/spinner.css';
import '../lib/angular-toggle-switch/angular-toggle-switch.css';

// External libraries
import '../lib/mqttws31';
import 'bootstrap';
import 'codemirror/mode/javascript/javascript';
import 'spectrum-colorpicker';

// Angular packages
import uiRouter from 'angular-ui-router';
import ngResource from 'angular-resource';
import ngSanitize from 'angular-sanitize';
import ngTouch from 'angular-touch';
import uiSelect from 'ui-select';
import monospacedElastic from 'angular-elastic/elastic';
import 'angular-xeditable/dist/js/xeditable';
import 'ng-file-upload';
import 'angular-sortable-view/src/angular-sortable-view';
import oclazyload from 'oclazyload';

// Non-npm packages (former bower packages)
// Use:
// $ git submodule init
// $ git submodule update
// to set up git submodules
import '../lib/angular-spectrum-colorpicker/dist/angular-spectrum-colorpicker';
import '../lib/angular-c3-simple/src/angular_c3_simple';
import '../lib/angular-order-object-by/src/ng-order-object-by';
import '../lib/angular-ui-codemirror/src/ui-codemirror';
import '../lib/angular-toggle-switch/angular-toggle-switch';

// homeui modules: sevices
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

// homeui modules: controllers
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
import NavigationCtrl from './controllers/navigationController';
import LoginCtrl from './controllers/loginController';
import FirmwareCtrl from './controllers/firmwareController';

// homeui modules: directives
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

// 3rdparty libraries
import './3rdparty/angular-json-editor'
import './3rdparty/jsoneditor'
import './3rdparty/ui-bootstrap'

// Angular routes
import routingModule from './app.routes';

// Internal components
import LoginFormModule from './components/loginForm';

//-----------------------------------------------------------------------------
/**
 * @ngdoc overview
 * @name homeuiApp
 * @description
 * # homeuiApp
 *
 * Main module of the application.
 */
const module = angular
  .module('homeuiApp', [
    routingModule,
    mqttServiceModule,
    metaTypeFilterModule,
    mqttRpcServiceModule,
    dumbTemplateModule,
    ngResource,
    uiRouter,
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
    'ngOrderObjectBy',
    'xeditable',
    uiSelect,
    monospacedElastic,
    oclazyload,
    LoginFormModule
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

module
  .config((JSONEditorProvider, DumbTemplateProvider) => {
    'ngInject';

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
  })
  .run(($rootScope, $location) => {
    $rootScope.objectsKeys = function(collection){
      return Object.keys(collection);
    };
    $rootScope.$on('$locationChangeStart', function(event, next, current) {
      if(current.split('/').pop() != 'edit' && current.split('/').pop() != 'new') $rootScope.showCreated = false;
      $rootScope.refererLocation = current;
    });
  });

//-----------------------------------------------------------------------------
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
