'use strict';

// Import slylesheets
import '../styles/css/bootstrap.min.css';
//import '../styles/css/demo.min.css'
import '../styles/css/fixes.css';
import '../styles/css/font-awesome.min.css';
import '../styles/css/invoice.min.css';
import '../styles/css/lockscreen.min.css';
import '../styles/css/smartadmin-production-plugins.min.css';
import '../styles/css/smartadmin-production.min.css';
import '../styles/css/smartadmin-rtl.min.css';
import '../styles/css/smartadmin-skins.min.css';

import '../styles/css/new.css';
import '../styles/main.css';
import '../styles/css/spacing.css';

import '../styles/css/wb-switch.css';

import 'spectrum-colorpicker/spectrum.css';
import 'ui-select/dist/select.css';
import 'angular-xeditable/dist/css/xeditable.css';
import '../lib/css-spinners/css/spinner/spinner.css';
import '../styles/css/angular.rangeSlider.css';
import 'ng-toast/dist/ngToast.css';

import 'angular-spinkit/build/angular-spinkit.min.css';

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

import handleDataService from './services/handle-data';

// homeui modules: controllers
import AlertCtrl from './controllers/alertController';
import HomeCtrl from './controllers/homeController';
import HelpCtrl from './controllers/helpController';
import NavigationCtrl from './controllers/navigationController';
import LoginCtrl from './controllers/loginController';
import FirmwareCtrl from './controllers/firmwareController';
import WebUICtrl from './controllers/webUiController';
import SystemCtrl from './controllers/systemController';
import MQTTCtrl from './controllers/MQTTChannelsController';
import AccessLevelCtrl from './controllers/accessLevelController';
import DateTimePickerModalCtrl from './controllers/dateTimePickerModalController';

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
import userRolesDirective from './directives/user-roles.directive';
import dashboardPickerDirective from './directives/dashboardpicker';
import plotlyDirective from "./directives/plotly";
import onResizeDirective from "./directives/resize";
import confirmDirective from "./directives/confirm";

import metaTypeFilterModule from './filters/metaTypeFilter';

// Angular routes
import routingModule from './app.routes';

// Internal components
import LoginFormModule from './components/loginForm/index';
import SvgEditorModule from './components/svgEditor/index';

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
        'ngResource',
        'ngSanitize',
        'ngTouch',
        'angularSpectrumColorpicker',
        'ngFileUpload',
        'ui.bootstrap',
        'ngOrderObjectBy',
        'xeditable',
        'ui.select',
        'monospaced.elastic',
        'angular-json-editor',
        'oc.lazyLoad',
        'pascalprecht.translate',
        'angular-spinkit',
        routingModule,
        metaTypeFilterModule,
        dumbTemplateModule,
        LoginFormModule,
        SvgEditorModule,

        'ui-rangeSlider',
        'ngToast',
        'ui.scroll',
        'tmh.dynamicLocale'
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
    .factory('gotoDefStart', gotoDefStartService)
    .factory('getTime', getTimeService)
    .factory('Spinner', spinnerService)
    .value('forceBeforeUnloadConfirmationForTests', false)
    .factory('PageState', pageStateService)
    .factory('DeviceData', deviceDataService)


    .service('handleData', handleDataService)
    .service('userAgentFactory', userAgentFactory)
    .service('rolesFactory', rolesFactory)
    .service('historyUrlService', historyUrlService)


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
    .controller('HelpCtrl', HelpCtrl)
    .controller('FirmwareCtrl', FirmwareCtrl)
    .controller('LoginCtrl', LoginCtrl)
    .controller('WebUICtrl', WebUICtrl)
    .controller('SystemCtrl', SystemCtrl)
    .controller('MQTTCtrl', MQTTCtrl)
    .controller('AccessLevelCtrl', AccessLevelCtrl)
    .controller('DateTimePickerModalCtrl', DateTimePickerModalCtrl);

module
    .controller('NavigationCtrl', NavigationCtrl)
    .directive('widgetMenuItem', function () {
        return {
            restrict: 'A',
            templateUrl: 'views/widgets/menu-item.html'
        };
    })
    .directive('widgetTemplateMenuItem', function () {
        return {
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
    .directive('rgbCell', rgbCellDirective)
    .directive('cellPicker', cellPickerDirective)
    .directive('explicitChanges', explicitChangesDirective)
    .directive('editableElasticTextarea', editableElasticTextareaDirective)
    .directive('userRole', userRolesDirective)
    .directive('dashboardPicker', dashboardPickerDirective)
    .directive('plotly', [ '$window', plotlyDirective ] )
    .directive('onResize', [ '$parse', onResizeDirective] )
    .directive('ngConfirm', confirmDirective);

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
    .run(($rootScope, $state) => {
        'ngInject';

        $rootScope.objectsKeys = function (collection) {
            return Object.keys(collection);
        };

        $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
            $rootScope.refererLocation = fromState;
        });

        $rootScope.$on('$stateChangeStart', () => {
          document.getElementById('overlay').classList.remove('overlay');
        });

        $rootScope.$on('$stateChangeStart', () => {
            $rootScope.stateIsLoading = true;
        });

        $rootScope.$on('$stateChangeSuccess', () => {
            $rootScope.stateIsLoading = false;
        });
    });

//-----------------------------------------------------------------------------
// Register module with communication
const realApp = angular.module('realHomeuiApp', [module.name, mqttServiceModule, mqttRpcServiceModule, 'pascalprecht.translate', 'tmh.dynamicLocale'])
    .config(($qProvider) => $qProvider.errorOnUnhandledRejections(false))
    .config(['$translateProvider', '$translatePartialLoaderProvider', function($translateProvider, $translatePartialLoaderProvider) {
        ['app', 'console', 'help', 'access', 'mqtt', 'system', 'ui', "logs",
         'configurations', 'rules', 'history', 'widgets', 'devices', 'units'].forEach(el => $translatePartialLoaderProvider.addPart(el));
        $translateProvider.useSanitizeValueStrategy('sceParameters');
        $translateProvider.useLoader('$translatePartialLoader', {
            urlTemplate: '/scripts/i18n/{part}/{lang}.json'
        });
        $translateProvider.preferredLanguage('en');
        $translateProvider.fallbackLanguage('en');
    }])
    .config(['tmhDynamicLocaleProvider', function(tmhDynamicLocaleProvider) {
        tmhDynamicLocaleProvider.localeLocationPattern('/scripts/i18n/angular-locale_{{locale}}.js');
    }])
    .config(['$compileProvider', function ($compileProvider) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|blob):/);
    }])
    .run(($rootScope, $window, mqttClient, ConfigEditorProxy, webuiConfigPath, errors, whenMqttReady,
          uiConfig, $timeout, configSaveDebounceMs, ngToast, $sce, $translate, uibDatepickerPopupConfig, tmhDynamicLocale) => {
        'ngInject';

        $rootScope.$on('$translateChangeSuccess', () => {
            $translate(['datepicker.buttons.close',
                        'datepicker.buttons.today',
                        'datepicker.buttons.clear',
                        'datepicker.format']).then(translations => {
                            uibDatepickerPopupConfig.closeText = translations['datepicker.buttons.close'];
                            uibDatepickerPopupConfig.currentText = translations['datepicker.buttons.today'];
                            uibDatepickerPopupConfig.clearText = translations['datepicker.buttons.clear'];
                            uibDatepickerPopupConfig.datepickerPopup =  translations['datepicker.format'];
                        });
        });

        //.........................................................................
        function configRequestMaker(mqttClient, ConfigEditorProxy, webuiConfigPath, errors, whenMqttReady, uiConfig) {
            return function (loginData) {
                if (loginData.host && loginData.port) {
                    var clientID = 'contactless-' + randomString(10);
                    if (mqttClient.isConnected()) {
                        mqttClient.disconnect();
                    }
                    mqttClient.connect(loginData.host, loginData.port, clientID, loginData.user, loginData.password);
                } else {
                    return false;
                }

                // Try to obtain WebUI configs
                whenMqttReady()
                    .then(() => {
                        return ConfigEditorProxy.Load({path: webuiConfigPath})
                    })
                    .then((result) => {
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
            }
        }

        $rootScope.requestConfig = configRequestMaker(mqttClient, ConfigEditorProxy, webuiConfigPath, errors, whenMqttReady, uiConfig);

        //.........................................................................
        const demoLoginData = {
            host: $window.location.hostname,
            port: 18883
        };

        if(!$window.localStorage.host || !$window.localStorage.port) {
            $window.localStorage.setItem('host', demoLoginData.host)
            $window.localStorage.setItem('port', demoLoginData.port)
        }

        var loginData = {
            host: $window.localStorage['host'],
            port: $window.localStorage['port'],
            user: $window.localStorage['user'],
            password: $window.localStorage['password'],
            prefix: $window.localStorage['prefix']
        };

        var language =  $window.localStorage['language'];
        if (!language) {
            language = window.navigator.language.startsWith('ru') ? 'ru' : 'en';
            $window.localStorage.setItem('language', language);
        }
        $translate.use(language);
        tmhDynamicLocale.set('ru');

        $rootScope.requestConfig(loginData);

        if (loginData['host'] === demoLoginData['host'] && loginData['port'] === demoLoginData['port']) {
          ngToast.danger({
            content: $sce.trustAsHtml('Please specify connection data in <a ui-sref="webUI" href="javascript:"> Settings -> web-ui </a>'),
            compileContent: true
          });
        }

        // TBD: the following should be handled by config sync service
        var configSaveDebounce = null;
        var firstBootstrap = true;

        // Watch for WebUI config changes
        $rootScope.$watch(() => uiConfig.filtered(), (newData, oldData) => {
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
                ConfigEditorProxy.Save({path: webuiConfigPath, content: newData})
                    .then(() => {
                        console.log('config saved');
                    })
                    .catch((err) => {
                        if (err.name === 'QuotaExceededError') {
                            errors.showError("app.errors.overflow");
                        } else {
                            errors.showError("app.errors.save", err);
                        }
                    });
            }, configSaveDebounceMs);
        }, true);


        setTimeout(() => {
            $('double-bounce-spinner').addClass('ng-hide');
            $('#wrapper').removeClass('ng-hide');
        }, 500);
    });

export default module.name;
export {realApp};
