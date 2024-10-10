'use strict';

// Import slylesheets
import '../styles/css/bootstrap.min.css';
import '../styles/css/font-awesome.min.css';
import '../styles/css/fontawesome.min.css';
import '../styles/css/fontawesome5-solid.min.css';
import '../styles/css/smartadmin-production.min.css';
import '../styles/css/icons.css';

import '../styles/css/new.css';
import '../styles/main.css';
import '../styles/css/spacing.css';

import '../styles/css/wb-switch.css';

import 'spectrum-colorpicker/spectrum.css';
import 'ui-select/dist/select.css';
import 'angular-xeditable/dist/css/xeditable.css';
import '../styles/css/spinner.css';
import '../styles/css/angular.rangeSlider.css';
import 'ng-toast/dist/ngToast.css';

import 'angular-spinkit/build/angular-spinkit.min.css';

import '../styles/css/device-manager.css';
import '../styles/css/scan.css';
import '../styles/css/network-connections.css';
import '../styles/css/svg-edit-page.css';
import '../styles/css/svg-view-page.css';
import '../styles/css/script-editor-page.css';

// homeui modules: sevices
import errorsService from './services/errors';
import mqttServiceModule from './services/mqttService';
import editorProxyService from './services/editorProxy';
import configEditorProxyService from './services/configEditorProxy';
import historyProxyService from './services/historyProxy';
import logsProxyService from './services/logsProxy';
import mqttRpcServiceModule from './services/rpc';
import gotoDefStartService from './services/gotoDefStart';
import getTimeService from './services/time';
import spinnerService from './services/spinner';
import dumbTemplateModule from './services/dumbtemplate';
import pageStateService from './services/pagestate';
import deviceDataService from './services/devicedata';
import uiConfigService from './services/uiconfig';
import hiliteService from './services/hilite';
import userAgentFactory from './services/userAgent.factory';
import rolesFactory from './services/roles.factory';
import historyUrlService from './services/historyUrl';
import diagnosticProxyService from './services/diagnosticProxy';
import serialMetricsProxyService from './services/serialMetricsProxy';
import translationService from './services/translationService';
import deviceManagerProxyService from './services/deviceManagerProxy';
import serialProxyService from './services/serialProxy';
import serialPortProxyService from './services/serialPortProxy';

import handleDataService from './services/handle-data';

// homeui modules: controllers
import AlertCtrl from './controllers/alertController';
import HomeCtrl from './controllers/homeController';
import NavigationCtrl from './controllers/navigationController';
import LoginCtrl from './controllers/loginController';
import MQTTCtrl from './controllers/MQTTChannelsController';
import AccessLevelCtrl from './controllers/accessLevelController';
import DateTimePickerModalCtrl from './controllers/dateTimePickerModalController';
import DiagnosticCtrl from './controllers/diagnosticController';
import BackupCtrl from './controllers/backupController';

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
import { displayCellDirective, displayCellConfig } from './directives/displaycell';
import cellNameDirective from './directives/cellname';
import rgbCellDirective from './directives/rgbcell';
import cellPickerDirective from './directives/cellpicker';
import explicitChangesDirective from './directives/explicitchanges';
import editableElasticTextareaDirective from './directives/editableelastictextarea';
import userRolesDirective from './directives/user-roles.directive';
import dashboardPickerDirective from './directives/dashboardpicker';
import onResizeDirective from './directives/resize';
import confirmDirective from './directives/confirm';
import fullscreenToggleDirective from './directives/fullscreenToggle';
import expCheckMetaDirective from './react-directives/exp-check/exp-check';

// Angular routes
import routingModule from './app.routes';

// Internal components
import LoginFormModule from './components/loginForm/index';

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
    'ngSanitize',
    'ngTouch',
    'angularSpectrumColorpicker',
    'ui.bootstrap',
    'xeditable',
    'ui.select',
    'monospaced.elastic',
    'oc.lazyLoad',
    'pascalprecht.translate',
    'angular-spinkit',
    routingModule,
    dumbTemplateModule,
    LoginFormModule,

    'ui-rangeSlider',
    'ngToast',
    'ui.scroll',
    'tmh.dynamicLocale',
    'angularjs-dropdown-multiselect',
  ])
  .value('historyMaxPoints', 1000)
  .value('logsMaxRows', 50)
  .value('webuiConfigPath', '/etc/wb-webui.conf')
  .value('configSaveDebounceMs', 300);

// Register services
module
  .factory('errors', errorsService)
  .factory('EditorProxy', editorProxyService)
  .factory('ConfigEditorProxy', configEditorProxyService)
  .factory('HistoryProxy', historyProxyService)
  .factory('LogsProxy', logsProxyService)
  .factory('SerialMetricsProxy', serialMetricsProxyService)
  .factory('gotoDefStart', gotoDefStartService)
  .factory('getTime', getTimeService)
  .factory('Spinner', spinnerService)
  .value('forceBeforeUnloadConfirmationForTests', false)
  .factory('PageState', pageStateService)
  .factory('DeviceData', deviceDataService)
  .factory('DiagnosticProxy', diagnosticProxyService)
  .factory('TranslationService', translationService)
  .factory('DeviceManagerProxy', deviceManagerProxyService)
  .factory('SerialProxy', serialProxyService)
  .factory('SerialPortProxy', serialPortProxyService)

  .service('handleData', handleDataService)
  .service('userAgentFactory', userAgentFactory)
  .service('rolesFactory', rolesFactory)
  .service('historyUrlService', historyUrlService)

  .run(DeviceData => {
    'ngInject';
    // make sure DeviceData is loaded at the startup so no MQTT messages are missed
  })
  .factory('uiConfig', uiConfigService)
  .filter('hilite', hiliteService);

// Register controllers
module
  .value('AlertDelayMs', 5000)
  .controller('AlertCtrl', AlertCtrl)
  .controller('HomeCtrl', HomeCtrl)
  .controller('LoginCtrl', LoginCtrl)
  .controller('MQTTCtrl', MQTTCtrl)
  .controller('AccessLevelCtrl', AccessLevelCtrl)
  .controller('DateTimePickerModalCtrl', DateTimePickerModalCtrl)
  .controller('DiagnosticCtrl', DiagnosticCtrl)
  .controller('BackupCtrl', BackupCtrl)
  .controller('NavigationCtrl', NavigationCtrl);

module.directive('scriptForm', function (PageState) {
  'ngInject';
  return {
    restrict: 'A',
    link: function (scope, element) {
      var formCtrl = scope[element.attr('name')];
      scope.$watch(element.attr('name') + '.$dirty', function (newValue) {
        PageState.setDirty(newValue);
      });
    },
  };
});

// Register directives
module
  .directive('cell', cellDirective)
  .value('scrollTimeoutMs', 100)
  .directive('console', consoleDirective)
  .directive('widget', widgetDirective)
  .directive('transformRgb', transformRgbDirective)
  .provider('displayCellConfig', displayCellConfig)
  .directive('displayCell', displayCellDirective)
  .config([
    'displayCellConfigProvider',
    function (displayCellConfigProvider) {
      displayCellConfigProvider.addDisplayType('alarm', 'alarm-cell', true);
    },
  ])
  .directive('alarmCell', alarmCellDirective)
  .config([
    'displayCellConfigProvider',
    function (displayCellConfigProvider) {
      displayCellConfigProvider.addDisplayType('value', 'value-cell');
    },
  ])
  .directive('valueCell', valueCellDirective)

  .config([
    'displayCellConfigProvider',
    function (displayCellConfigProvider) {
      displayCellConfigProvider.addDisplayType('switch', 'switch-cell');
    },
  ])
  .directive('switchCell', switchCellDirective)
  .config([
    'displayCellConfigProvider',
    function (displayCellConfigProvider) {
      displayCellConfigProvider.addDisplayType('text', 'text-cell');
    },
  ])
  .directive('textCell', textCellDirective)
  .config([
    'displayCellConfigProvider',
    function (displayCellConfigProvider) {
      displayCellConfigProvider.addDisplayType('range', 'range-cell');
    },
  ])
  .directive('rangeCell', rangeCellDirective)
  .config([
    'displayCellConfigProvider',
    function (displayCellConfigProvider) {
      displayCellConfigProvider.addDisplayType('button', 'button-cell', true);
    },
  ])
  .directive('buttonCell', buttonCellDirective)
  .directive('cellName', cellNameDirective)
  .value('rgbLocalStorageKey', 'cell_rgb_palette')
  .config([
    'displayCellConfigProvider',
    function (displayCellConfigProvider) {
      displayCellConfigProvider.addDisplayType('rgb', 'rgb-cell');
    },
  ])
  .directive('rgbCell', rgbCellDirective)
  .directive('cellPicker', cellPickerDirective)
  .directive('explicitChanges', explicitChangesDirective)
  .directive('editableElasticTextarea', editableElasticTextareaDirective)
  .directive('userRole', userRolesDirective)
  .directive('dashboardPicker', dashboardPickerDirective)
  .directive('onResize', ['$parse', onResizeDirective])
  .directive('ngConfirm', confirmDirective)
  .directive('fullscreenToggle', fullscreenToggleDirective)
  .directive('expCheckWidget', expCheckMetaDirective);

module
  .config([
    '$translateProvider',
    '$translatePartialLoaderProvider',
    function ($translateProvider, $translatePartialLoaderProvider) {
      [
        'app',
        'console',
        'help',
        'access',
        'mqtt',
        'system',
        'ui',
        'logs',
        'configurations',
        'rules',
        'history',
        'widgets',
        'devices',
        'units',
        'serial-metrics',
      ].forEach(el => $translatePartialLoaderProvider.addPart(el));
      $translateProvider.useSanitizeValueStrategy('sceParameters');
      $translateProvider.useLoader('$translatePartialLoader', {
        urlTemplate: '/scripts/i18n/{part}/{lang}.json?v=' + __webpack_hash__,
      });
      $translateProvider.preferredLanguage('en');
      $translateProvider.fallbackLanguage('en');
    },
  ])
  .config([
    'tmhDynamicLocaleProvider',
    function (tmhDynamicLocaleProvider) {
      tmhDynamicLocaleProvider.localeLocationPattern('/scripts/i18n/angular-locale_{{locale}}.js');
    },
  ]);

module.run(($rootScope, $state, $transitions) => {
  'ngInject';

  $rootScope.$state = $state;

  $rootScope.objectsKeys = function (collection) {
    return Object.keys(collection);
  };

  $transitions.onStart({}, function (trans) {
    document.getElementById('overlay').classList.remove('overlay');
    $rootScope.stateIsLoading = true;
  });

  $transitions.onSuccess({}, function (trans) {
    $rootScope.stateIsLoading = false;
  });

  $rootScope.checkFullscreen = () => {
    const fullScreenElement =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null;

    return fullScreenElement !== null || $rootScope.forceFullscreen;
  };

  $rootScope.forceFullscreen = false;
});

//-----------------------------------------------------------------------------
// Register module with communication
const realApp = angular
  .module('realHomeuiApp', [module.name, mqttServiceModule, mqttRpcServiceModule])
  .config([
    '$qProvider',
    function ($qProvider) {
      $qProvider.errorOnUnhandledRejections(false);
    },
  ])
  .config([
    '$compileProvider',
    function ($compileProvider) {
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|blob):/);
    },
  ])
  .run(
    (
      $rootScope,
      $window,
      mqttClient,
      ConfigEditorProxy,
      webuiConfigPath,
      errors,
      whenMqttReady,
      uiConfig,
      $timeout,
      configSaveDebounceMs,
      ngToast,
      $sce,
      $translate,
      uibDatepickerPopupConfig,
      tmhDynamicLocale,
      DeviceManagerProxy
    ) => {
      'ngInject';

      $rootScope.$on('$translateChangeSuccess', () => {
        $translate([
          'datepicker.buttons.close',
          'datepicker.buttons.today',
          'datepicker.buttons.clear',
          'datepicker.format',
        ]).then(translations => {
          uibDatepickerPopupConfig.closeText = translations['datepicker.buttons.close'];
          uibDatepickerPopupConfig.currentText = translations['datepicker.buttons.today'];
          uibDatepickerPopupConfig.clearText = translations['datepicker.buttons.clear'];
          uibDatepickerPopupConfig.datepickerPopup = translations['datepicker.format'];
        });
      });

      //.........................................................................
      function configRequestMaker(
        mqttClient,
        ConfigEditorProxy,
        webuiConfigPath,
        errors,
        whenMqttReady,
        uiConfig
      ) {
        return function (loginData) {
          if (loginData.url) {
            var clientID = 'wb-mqtt-homeui-' + randomString(10);
            if (mqttClient.isConnected()) {
              mqttClient.disconnect();
            }
            mqttClient.connect(loginData.url, clientID, loginData.user, loginData.password);
          } else {
            return false;
          }

          // Try to obtain WebUI configs
          whenMqttReady()
            .then(() => {
              return ConfigEditorProxy.Load({ path: webuiConfigPath });
            })
            .then(result => {
              console.log('LOAD CONF: %o', result.content);
              uiConfig.ready(result.content);
            })
            .catch(errors.catch('app.errors.load'));

          return true;

          //.....................................................................
          // TBD: loginService
          function randomString(length) {
            var text = '';
            var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            for (var i = 0; i < length; i++)
              text += chars.charAt(Math.floor(Math.random() * chars.length));
            return text;
          }
        };
      }

      $rootScope.requestConfig = configRequestMaker(
        mqttClient,
        ConfigEditorProxy,
        webuiConfigPath,
        errors,
        whenMqttReady,
        uiConfig
      );

      //.........................................................................

      // common settings for all scenarios
      var loginData = {
        user: $window.localStorage['user'],
        password: $window.localStorage['password'],
        prefix: $window.localStorage['prefix'],
      };

      // detect auto url
      var autoURL = new URL('/mqtt', $window.location.href);
      autoURL.protocol = autoURL.protocol.replace('http', 'ws');

      // FIXME: I know it's ugly, let's find more elegant way later
      var isDev = $window.location.host === 'localhost:8080';

      if (isDev) {
        // local debug detected, enable MQTT url override via settings
        if (!$window.localStorage.url) {
          $window.localStorage.setItem('url', autoURL.href);
        }
        loginData['url'] = $window.localStorage['url'];
      } else {
        // no local debug detected, full auto
        loginData['url'] = autoURL.href;
      }

      let language = 'en';
      $translate.use(language);
      tmhDynamicLocale.set(language);

      $rootScope.requestConfig(loginData);

      // TBD: the following should be handled by config sync service
      var configSaveDebounce = null;
      var firstBootstrap = true;

      // Watch for WebUI config changes
      $rootScope.$watch(
        () => uiConfig.filtered(),
        (newData, oldData) => {
          if (angular.equals(newData, oldData)) {
            return;
          }
          if (firstBootstrap) {
            firstBootstrap = false;
            return;
          }
          console.log('new data: %o', newData);
          if (configSaveDebounce) {
            $timeout.cancel(configSaveDebounce);
          }
          configSaveDebounce = $timeout(() => {
            errors.hideError();
            ConfigEditorProxy.Save({ path: webuiConfigPath, content: newData })
              .then(() => {
                console.log('config saved');
              })
              .catch(err => {
                if (err.name === 'QuotaExceededError') {
                  errors.showError('app.errors.overflow');
                } else {
                  errors.showError('app.errors.save', err);
                }
              });
          }, configSaveDebounceMs);
        },
        true
      );

      whenMqttReady()
        .then(() => DeviceManagerProxy.Stop())
        .then(result => {
          if (result == 'Ok') {
            $translate('app.errors.stop-scan').then(m => ngToast.danger(m));
          }
        });

      setTimeout(() => {
        $('double-bounce-spinner').addClass('ng-hide');
        $('#wrapper').removeClass('ng-hide');
      }, 500);
    }
  );

export default module.name;
export { realApp };
