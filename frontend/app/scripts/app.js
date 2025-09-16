/* global angular */

'use strict';

// Import slylesheets
import '@/assets/styles/variables.css';
import '@/assets/styles/animations.css';
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
import '../styles/css/mbgate.css';

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
import rolesFactoryService from './services/roles.factory';
import historyUrlService from './services/historyUrl';
import diagnosticProxyService from './services/diagnosticProxy';
import serialMetricsProxyService from './services/serialMetricsProxy';
import translationService from './services/translationService';
import deviceManagerProxyService from './services/deviceManagerProxy';
import serialProxyService from './services/serialProxy';
import serialPortProxyService from './services/serialPortProxy';
import fwUpdateProxyService from './services/fwUpdateProxy';

import handleDataService from './services/handle-data';

// homeui modules: controllers
import AlertCtrl from './controllers/alertController';
import HomeCtrl from './controllers/homeController';
import NavigationCtrl from './controllers/navigationController';
import MQTTCtrl from './controllers/MQTTChannelsController';
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
import usersPageDirective from './react-directives/users/users';
import loginPageDirective from './react-directives/login/login-page';

// Angular routes
import routingModule from './app.routes';

import { checkHttps } from '@/utils/httpsUtils';
import { fillUserType}  from './utils/authUtils';
import angular from 'angular';

import { aliceStore } from '@/stores/alice';

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
  .factory('FwUpdateProxy', fwUpdateProxyService)

  .service('handleData', handleDataService)
  .service('userAgentFactory', userAgentFactory)
  .service('rolesFactory', rolesFactoryService)
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
  .controller('MQTTCtrl', MQTTCtrl)
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
  .directive('expCheckWidget', expCheckMetaDirective)
  .directive('usersPage', usersPageDirective)
  .directive('loginPage', loginPageDirective);

module
  .config([
    '$translateProvider',
    '$translatePartialLoaderProvider',
    function ($translateProvider, $translatePartialLoaderProvider) {
      [
        'app',
        'console',
        'help',
        'mqtt',
        'system',
        'ui',
        'logs',
        'configurations',
        'history',
        'widgets',
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

module.run(($rootScope, $state, $transitions, rolesFactory) => {
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

  if (!__IS_PROD__) {
    $rootScope.theme = localStorage.getItem('theme') || 'bootstrap';
    window.toggleTheme = () => {
      const themes = ['bootstrap', 'wirenboard', 'dark'];
      const themeIndex = themes.indexOf($rootScope.theme || 'bootstrap');
      localStorage.setItem('theme', themes[themeIndex + 1] || themes[0]);
      $rootScope.theme = localStorage.getItem('theme');
    };
  }

  $rootScope.allowWbRulesDebug = () => {
    return rolesFactory.checkRights(rolesFactory.ROLE_THREE);
  }

  $rootScope.disableNavigation = () => {
    return !rolesFactory.isAuthenticated();
  }

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
      DeviceManagerProxy,
      $transitions,
      rolesFactory,
      $state
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

      const loginUrl = new URL('/mqtt', $window.location.origin);
      loginData.url = loginUrl.href;

      let language = localStorage.getItem('language');
      const supportedLanguages = ['en', 'ru'];
      if (!language || !supportedLanguages.includes(language)) {
        language =
          navigator.languages
            .map(lang => lang.split('-')[0])
            .find(lang => supportedLanguages.includes(lang)) || 'en';
        localStorage.setItem('language', language);
      }
      $translate.use(language);
      tmhDynamicLocale.set(language);

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

      // check if the integrations are available to display the menu item
      $rootScope.integrations = [];
      const { checkIsAvailable } = aliceStore;
      function checkAvailableIntegrations(lang = language) {
        $rootScope.integrations = [];
        checkIsAvailable()
          .then(() => {
            // it was decided to show Alice only for the Russian localization
            if (lang === 'ru') {
              $rootScope.integrations.push('alice');
            }
          })
          .catch(() => {});
      }
      checkAvailableIntegrations();

      $rootScope.$on('$translateChangeSuccess', function(event, data) {
        checkAvailableIntegrations(data.language);
      });

      whenMqttReady()
        .then(() => {
          if (rolesFactory.checkRights(rolesFactory.ROLE_THREE)) {
            return DeviceManagerProxy.Stop();
          }
          return false;
        })
        .then(result => {
          if (result == 'Ok') {
            $translate('app.errors.stop-scan').then(m => ngToast.danger(m));
          }
        });

      $transitions.onBefore({}, function (transition) {
        if ($rootScope.noHttps !== undefined || __DISABLE_HTTPS_CHECK__) {
          return true;
        }
        return checkHttps().then(res => {
          if (res !== 'redirected') {
            $rootScope.noHttps = res === 'warn';
          }
        });
      });

      let httpsSetupTimer = setTimeout(() => {
        angular.element('#https-setup-label')[0].style.display = 'flex';
      }, 1000);

      let hideGlobalSpinner = true;
      let connectToMqtt = true;
      $transitions.onBefore({}, function (transition) {
        return fillUserType(rolesFactory).then(fillUserTypeResult => {
          if (hideGlobalSpinner) {
            clearTimeout(httpsSetupTimer);
            angular.element('#https-setup-label').remove();
            angular.element('double-bounce-spinner').remove();
            angular.element('#wrapper').removeClass('fade');
            hideGlobalSpinner = false;
          }
          if (fillUserTypeResult === 'login') {
            // transition.params() contains all possible parameters by default - let's delete them
            const cleanParams = (params) => {
              return Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v !== undefined && v !== null)
              );
            }

            const params = transition.to().name === 'home' ? {} : {
              returnState: transition.to().name,
              returnParams: new URLSearchParams(cleanParams(transition.params())).toString(),
            };
            return transition.to().name === 'login' || $state.target('login', params);
          }
          if (connectToMqtt) {
            const loginUrl = new URL('/mqtt', $window.location.origin);
            loginUrl.protocol = loginUrl.protocol.replace('http', 'ws');
            let loginData = {
              url: loginUrl.href,
            };
            // Use old credentials if authentication is not configured
            if (!rolesFactory.hasConfiguredAdmin) {
              loginData.user = $window.localStorage['user'];
              loginData.password = $window.localStorage['password'];
              loginData.prefix = $window.localStorage['prefix'];
            }
            $rootScope.requestConfig(loginData);
            connectToMqtt = false;
          }
          if (transition.to().name === 'login' && !rolesFactory.currentUserIsAutologinUser) {
            return $state.target('home');
          }
        });
      });
    }
  );

export default module.name;
export { realApp };
