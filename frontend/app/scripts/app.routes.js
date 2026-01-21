import uiRouter from 'angular-ui-router';

function routing($stateProvider, $locationProvider, $urlRouterProvider) {
  'ngInject';

  // use the HTML5 History API
  $locationProvider.html5Mode(false);
  $locationProvider.hashPrefix('!');
  $urlRouterProvider.otherwise('/');

  $stateProvider
    //...........................................................................
    .state('home', {
      url: '/',
      template: require('../views/home.html'),
      controller: 'HomeCtrl as $ctrl',
    })
    .state('help', {
      url: '/help',
      template: require('../views/help.html'),
    })
    .state('webUI', {
      url: '/web-ui',
      template: '<web-ui-settings-page />',
            resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'web-ui' */ './controllers/webUiController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })
    .state('system', {
      url: '/system',
      template: require('../views/system.html'),
      controller: 'SystemCtrl as $ctrl',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'system' */ './controllers/systemController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })
    .state('MQTTChannels', {
      url: '/MQTTChannels',
      template: require('../views/MQTTChannels.html'),
      controller: 'MQTTCtrl as $ctrl',
    })
    .state('accessLevel', {
      url: '/access-level',
      template: '<users-page />',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'users' */ './controllers/usersController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })
    .state('scan', {
      url: '/scan',
      redirectTo: 'serial-config',
    })
    //...........................................................................
    .state('devices', {
      url: '/devices',
      template: '<devices-page />',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'devices' */ './controllers/devicesController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })
    //...........................................................................
    .state('widgets', {
      url: '/widgets',
      controller: 'WidgetsCtrl as $ctrl',
      template: require('../views/widgets.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'widgets' */ './controllers/widgetsController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })
    //...........................................................................
    .state('dashboards', {
      url: '/dashboards',
      template: '<dashboards-page />',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(
            /* webpackChunkName: 'dashboards' */ './controllers/dashboardsController'
          ).then(module => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('dashboard', {
      url: '/dashboards/{id}?{hmi:boolean}&{hmicolor}&{fullscreen:boolean}&{sourceDashboardId}',
      template: '<dashboard-page />',
      params: {
        id: { dynamic: true },
        hmi: { dynamic: true },
        hmicolor: { dynamic: true },
        fullscreen: { dynamic: true },
        sourceDashboardId: { dynamic: true },
      },
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(
            /* webpackChunkName: 'dashboard' */ './controllers/dashboardController'
          ).then(module => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('dashboard-svg', {
      url: '/dashboards/svg/view/:id?{hmi:boolean}&{hmicolor}&{fullscreen:boolean}',
      template: '<svg-dashboard-page />',
      params: {
        id: {
          dynamic: true,
        },
      },
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(
            /* webpackChunkName: 'dashboard-svg' */ './controllers/dashboardSvgController'
          ).then(module => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('dashboard-svg-add', {
      url: '/dashboards/svg/add',
      controller: 'DashboardSvgEditCtrl as $ctrl',
      template: require('../views/dashboard-svg-edit.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(
            /* webpackChunkName: 'dashboard-svg-edit' */ './controllers/dashboardSvgEditController'
          ).then(module => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('dashboard-svg-edit', {
      url: '/dashboards/svg/edit/{id}',
      controller: 'DashboardSvgEditCtrl as $ctrl',
      template: require('../views/dashboard-svg-edit.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(
            /* webpackChunkName: 'dashboard-svg-edit' */ './controllers/dashboardSvgEditController'
          ).then(module => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('login', {
      url: '/login?{returnState}&{returnParams}',
      template: '<login-page />'
    })
    //...........................................................................
    .state('rules', {
      url: '/rules',
      template: '<rules-page />',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'rules' */ './controllers/rulesController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })
    //...........................................................................
    .state('rules-edit', {
      url: '/rules/edit/{path:.*}',
      template: '<rule-page />',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'rule' */ './controllers/ruleController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })
    //...........................................................................
    .state('rules-new', {
      url: '/rules/new',
      template: '<rule-page />',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'rule' */ './controllers/ruleController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })
    //...........................................................................
    .state('history', {
      url: '/history?{fullscreen:boolean}',
      controller: 'HistoryCtrl as $ctrl',
      template: require('../views/history.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'history' */ './controllers/historyController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })
    //...........................................................................
    .state('history.sample', {
      url: '/{data}',
      template: require('../views/history.html'),
      controller: 'HistoryCtrl as $ctrl',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'history' */ './controllers/historyController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })
    //...........................................................................
    .state('configs', {
      url: '/configs',
      template: '<configs-page />',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'configs' */ './controllers/configsController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })

    //...........................................................................
    .state('configEdit', {
      url: '/configs/edit/{path:.*}',
      controller: 'ConfigCtrl as $ctrl',
      template: require('../views/config.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'config' */ './controllers/configController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })
    //...........................................................................
    .state('network-connections', {
      url: '/network-connections',
      template: require('../views/network-connections.html'),
      controller: 'NetworkConnectionsCtrl as $ctrl',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(
            /* webpackChunkName: 'network-connections' */ './controllers/networkConnectionsController'
          ).then(module => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('serial-config', {
      url: '/serial-config',
      template: require('../views/serial-config.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(
            /* webpackChunkName: 'device-manager' */ './controllers/deviceManagerController'
          ).then(module => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('serial-config.properties', {
      url: '/properties',
      params: {
        hint: false,
      },
    })
    //...........................................................................
    .state('serial-config.scan', {
      url: '/scan',
      params: {
        hint: false,
      },
    })
    //...........................................................................
    .state('logs', {
      url: '/logs',
      controller: 'LogsCtrl as $ctrl',
      template: require('../views/logs.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'logs' */ './controllers/logsController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })
    //...........................................................................
    .state('mbgate', {
      url: '/mbgate',
      template: require('../views/mbgate.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'mbgate' */ './controllers/mbGateController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    })
    //...........................................................................
    .state('integrations-alice', {
      url: '/integrations/alice',
      template: '<alice-page />',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'alice' */ './controllers/aliceController').then(
            module => $ocLazyLoad.load({ name: module.default.name })
          );
        },
      },
    });
}

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.routing', [uiRouter])
  .config([
    '$urlServiceProvider',
    function ($urlServiceProvider) {
      $urlServiceProvider.config.type('boolean', {
        decode: val => {
          return val == true ? true : val == 'true' ? true : false;
        },
        encode: val => {
          return val ? true : false;
        },
        equals: (a, b) => {
          return a === b;
        },
        is: val => {
          return [true, false].indexOf(val) >= 0;
        },
        pattern: /bool|true|false|0|1/,
      });
    },
  ])
  .config(routing).name;
