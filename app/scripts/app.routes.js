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
      resolve: {
        ctrl: async ($translatePartialLoader, $translate) => {
          $translatePartialLoader.addPart('help');
          await $translate.refresh();
        }
      }
    })
    .state('webUI', {
      url: '/web-ui',
      template: require('../views/web-ui.html'),
      controller: 'WebUICtrl as $ctrl',
      resolve: {
        ctrl: async ($translatePartialLoader, $translate) => {
          $translatePartialLoader.addPart('ui');
          await $translate.refresh();
        }
      }
    })
    .state('system', {
      url: '/system',
      template: require('../views/system.html'),
      controller: 'SystemCtrl as $ctrl',
      resolve: {
        ctrl: async ($translatePartialLoader, $translate) => {
          $translatePartialLoader.addPart('system');
          await $translate.refresh();
        }
      }
    })
    .state('MQTTChannels', {
      url: '/MQTTChannels',
      template: require('../views/MQTTChannels.html'),
      controller: 'MQTTCtrl as $ctrl',
      resolve: {
        ctrl: async ($translatePartialLoader, $translate) => {
          $translatePartialLoader.addPart('mqtt');
          await $translate.refresh();
        }
      }
    })
    .state('accessLevel', {
      url: '/access-level',
      template: require('../views/access-level.html'),
      controller: 'AccessLevelCtrl as $ctrl',
      resolve: {
        ctrl: async ($translatePartialLoader, $translate) => {
          $translatePartialLoader.addPart('access');
          await $translate.refresh();
        }
      }
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
        ctrl: async ($q, $ocLazyLoad, $translatePartialLoader, $translate) => {
          'ngInject';
          $translatePartialLoader.addPart('devices');
          await $translate.refresh();
          let deferred = $q.defer();
          require.ensure(
            [],
            require => {
              let module = require('./controllers/devicesController.js');
              $ocLazyLoad
                .load({
                  name: module.default.name,
                })
                .then(() => {
                  deferred.resolve(module);
                });
            },
            'devices'
          );
          return deferred.promise;
        },
      },
    })
    //...........................................................................
    .state('currentDevices', {
      url: '/devices/{deviceId}',
      controller: 'DevicesCtrl as $ctrl',
      template: require('../views/devices.html'),
      resolve: {
        ctrl: async ($q, $ocLazyLoad, $translatePartialLoader, $translate) => {
          'ngInject';
          $translatePartialLoader.addPart('devices');
          await $translate.refresh();
          let deferred = $q.defer();
          require.ensure(
            [],
            require => {
              let module = require('./controllers/devicesController.js');
              $ocLazyLoad
                .load({
                  name: module.default.name,
                })
                .then(() => {
                  deferred.resolve(module);
                });
            },
            'devices'
          );
          return deferred.promise;
        },
      },
    })
    //...........................................................................
    .state('widgets', {
      url: '/widgets',
      controller: 'WidgetsCtrl as $ctrl',
      template: require('../views/widgets.html'),
      resolve: {
        ctrl: async ($q, $ocLazyLoad, $translatePartialLoader, $translate) => {
          'ngInject';
          $translatePartialLoader.addPart('widgets');
          await $translate.refresh();
          let deferred = $q.defer();
          require.ensure(
            [],
            require => {
              let module = require('./controllers/widgetsController.js');
              $ocLazyLoad
                .load({
                  name: module.default.name,
                })
                .then(() => {
                  deferred.resolve(module);
                });
            },
            'widgets'
          );
          return deferred.promise;
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
          let deferred = $q.defer();
          require.ensure(
            [],
            require => {
              let module = require('./controllers/dashboardsController.js');
              $ocLazyLoad
                .load({
                  name: module.default.name,
                })
                .then(() => {
                  deferred.resolve(module);
                });
            },
            'dashboards'
          );
          return deferred.promise;
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
          let deferred = $q.defer();
          require.ensure(
            [],
            require => {
              let module = require('./controllers/dashboardController.js');
              $ocLazyLoad
                .load({
                  name: module.default.name,
                })
                .then(() => {
                  deferred.resolve(module);
                });
            },
            'dashboard'
          );
          return deferred.promise;
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
    })
    //...........................................................................
    .state('dashboard-svg-add', {
      url: '/dashboards/svg/add',
      controller: 'DashboardSvgEditCtrl as $ctrl',
      template: require('../views/dashboard-svg-edit.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          return import('./controllers/dashboardSvgEditController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }))
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
          return import('./controllers/dashboardSvgEditController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }))
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
        ctrl: async ($q, $ocLazyLoad, $translatePartialLoader, $translate) => {
          'ngInject';
          $translatePartialLoader.addPart('rules');
          await $translate.refresh();
          return import('./controllers/scriptsController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }))
        },
      },
    })
    //...........................................................................
    .state('rules-edit', {
      url: '/rules/edit/{path:.*}',
      template: require('../views/script.html'),
      controller: 'ScriptsCtrl as $ctrl',
      resolve: {
        ctrl: async ($q, $ocLazyLoad, $translatePartialLoader, $translate) => {
          'ngInject';
          $translatePartialLoader.addPart('rules');
          await $translate.refresh();
          return import('./controllers/scriptsController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }))
        },
      },
    })
    //...........................................................................
    .state('rules-new', {
      url: '/rules/new',
      template: require('../views/script.html'),
      controller: 'ScriptsCtrl as $ctrl',
      resolve: {
        ctrl: async ($q, $ocLazyLoad, $translatePartialLoader, $translate) => {
          'ngInject';
          $translatePartialLoader.addPart('rules');
          await $translate.refresh();
          return import('./controllers/scriptsController')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }))
        },
      },
    })
    //...........................................................................
    .state('history', {
      url: '/history',
      controller: 'HistoryCtrl as $ctrl',
      template: require('../views/history.html'),
      resolve: {
        ctrl: async ($q, $ocLazyLoad, $translatePartialLoader, $translate) => {
          'ngInject';
          $translatePartialLoader.addPart('history');
          await $translate.refresh();
          let deferred_1 = $q.defer();
          require.ensure(
            [],
            require => {
              let module_1 = require('./controllers/historyController.js');
              $ocLazyLoad
                .load({
                  name: module_1.default.name,
                })
                .then(() => {
                  deferred_1.resolve(module_1);
                });
            },
            'history'
          );
          return deferred_1.promise;
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
          let deferred_1 = $q.defer();
          require.ensure(
            [],
            require => {
              let module_1 = require('./controllers/historyController.js');
              $ocLazyLoad
                .load({
                  name: module_1.default.name,
                })
                .then(() => {
                  deferred_1.resolve(module_1);
                });
            },
            'history'
          );
          return deferred_1.promise;
        },
      },
    })
    //...........................................................................
    .state('configs', {
      url: '/configs',
      controller: 'ConfigsCtrl as $ctrl',
      template: require('../views/configs.html'),
      resolve: {
        ctrl: async ($q, $ocLazyLoad, $translatePartialLoader, $translate) => {
          'ngInject';
          $translatePartialLoader.addPart('configurations');
          await $translate.refresh();
          let deferred = $q.defer();
          require.ensure(
            [],
            require => {
              let module = require('./controllers/configsController.js');
              $ocLazyLoad
                .load({
                  name: module.default.name,
                })
                .then(() => {
                  deferred.resolve(module);
                });
            },
            'configs'
          );
          return deferred.promise;
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
          return import('./controllers/configController.js')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }))
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
          let deferred = $q.defer();
          require.ensure(
            [],
            require => {
              let module = require('./controllers/networkConnectionsController.js');
              $ocLazyLoad
                .load({
                  name: module.default.name,
                })
                .then(() => {
                  deferred.resolve(module);
                });
            },
            'network-connections'
          );
          return deferred.promise;
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
          return import('./controllers/deviceManagerController.js')
            .then((module) => $ocLazyLoad.load({ name: module.default.name }))
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
        ctrl: async ($q, $ocLazyLoad, $translatePartialLoader, $translate) => {
          'ngInject';
          $translatePartialLoader.addPart('logs');
          await $translate.refresh();
          let deferred_1 = $q.defer();
          require.ensure(
            [],
            require => {
              let module_1 = require('./controllers/logsController.js');
              $ocLazyLoad
                .load({
                  name: module_1.default.name,
                })
                .then(() => {
                  deferred_1.resolve(module_1);
                });
            },
            'logs'
          );
          return deferred_1.promise;
        },
      },
    })
    //...........................................................................
    .state('serial-metrics', {
      url: '/serial-metrics',
      controller: 'SerialMetricsCtrl as $ctrl',
      template: require('../views/serial-metrics.html'),
      resolve: {
        ctrl: async ($q, $ocLazyLoad, $translatePartialLoader, $translate) => {
          'ngInject';
          $translatePartialLoader.addPart('serial-metrics');
          await $translate.refresh();
          let deferred_1 = $q.defer();
          require.ensure(
            [],
            require => {
              let module_1 = require('./controllers/serialMetricsController.js');
              $ocLazyLoad
                .load({
                  name: module_1.default.name,
                })
                .then(() => {
                  deferred_1.resolve(module_1);
                });
            },
            'serial-metrics'
          );
          return deferred_1.promise;
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
