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
      template: require('../views/web-ui.html'),
      controller: 'WebUICtrl as $ctrl',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'webUi' */ './controllers/webUiController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
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
          return import(/* webpackChunkName: 'system' */ './controllers/systemController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
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
      template: require('../views/access-level.html'),
      controller: 'AccessLevelCtrl as $ctrl',
    })
    .state('scan', {
      url: '/scan',
      redirectTo: 'serial-config',
    })
    //...........................................................................
    .state('devices', {
      url: '/devices',
      controller: 'DevicesCtrl as $ctrl',
      template: require('../views/devices.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'devices' */ './controllers/devicesController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('currentDevices', {
      url: '/devices/{deviceId}',
      controller: 'DevicesCtrl as $ctrl',
      template: require('../views/devices.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'devices' */ './controllers/devicesController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
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
          return import(/* webpackChunkName: 'widgets' */ './controllers/widgetsController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('dashboards', {
      url: '/dashboards',
      controller: 'DashboardsCtrl as $ctrl',
      template: require('../views/dashboards.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'dashboards' */ './controllers/dashboardsController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('dashboard', {
      url: '/dashboards/{id}?{hmi:boolean}&{hmicolor}&{fullscreen:boolean}',
      controller: 'DashboardCtrl as $ctrl',
      template: require('../views/dashboard.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'dashboard' */ './controllers/dashboardController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('dashboard-svg', {
      url: '/dashboards/svg/view/:id?{hmi:boolean}&{hmicolor}&{fullscreen:boolean}',
      controller: 'DashboardSvgCtrl as $ctrl',
      template: require('../views/dashboard-svg.html'),
      params: {
        id: {
          dynamic: true,
        },
      },
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'dashboard-svg' */ './controllers/dashboardSvgController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
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
          return import(/* webpackChunkName: 'dashboard-svg-edit' */ './controllers/dashboardSvgEditController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
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
          return import(/* webpackChunkName: 'dashboard-svg-edit' */ './controllers/dashboardSvgEditController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('login', {
      url: '/login/{id}',
      template: require('../views/login.html'),
      controller: 'LoginCtrl as $ctrl',
    })
    //...........................................................................
    .state('rules', {
      url: '/rules',
      controller: 'ScriptsCtrl as $ctrl',
      template: require('../views/scripts.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'rules' */ './controllers/scriptsController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('rules-edit', {
      url: '/rules/edit/{path:.*}',
      template: require('../views/script.html'),
      controller: 'ScriptCtrl as $ctrl',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'rules' */ './controllers/scriptController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('rules-new', {
      url: '/rules/new',
      template: require('../views/script.html'),
      controller: 'ScriptCtrl as $ctrl',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'rules' */ './controllers/scriptController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('history', {
      url: '/history',
      controller: 'HistoryCtrl as $ctrl',
      template: require('../views/history.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'history' */ './controllers/historyController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
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
          return import(/* webpackChunkName: 'history' */ './controllers/historyController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('configs', {
      url: '/configs',
      controller: 'ConfigsCtrl as $ctrl',
      template: require('../views/configs.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'configs' */ './controllers/configsController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
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
          return import(/* webpackChunkName: 'config' */ './controllers/configController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('network-connections', {
      url: '/network-connections/{path:.*}',
      template: require('../views/network-connections.html'),
      controller: 'NetworkConnectionsCtrl as $ctrl',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'network-connections' */ './controllers/networkConnectionsController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
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
          return import(/* webpackChunkName: 'device-manager' */ './controllers/deviceManagerController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
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
    .state('logs', {
      url: '/logs',
      controller: 'LogsCtrl as $ctrl',
      template: require('../views/logs.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'logs' */ './controllers/logsController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
        },
      },
    })
    //...........................................................................
    .state('serial-metrics', {
      url: '/serial-metrics',
      controller: 'SerialMetricsCtrl as $ctrl',
      template: require('../views/serial-metrics.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import(/* webpackChunkName: 'serial-metrics' */ './controllers/serialMetricsController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }));
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
