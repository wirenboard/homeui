import uiRouter from 'angular-ui-router';

function routing($stateProvider,  $locationProvider, $urlRouterProvider) {
  'ngInject';

  // use the HTML5 History API
  $locationProvider.html5Mode(false);
  $locationProvider.hashPrefix('!');
  $urlRouterProvider.otherwise('/');

  $stateProvider
  //...........................................................................
    .state('home', {
      url: '/',
      templateUrl: require('../views/home.html'),
      controller: 'HomeCtrl as $ctrl'
    })
      .state('help', {
          url: '/help',
          templateUrl: require('../views/help.html'),
          controller: 'HelpCtrl as $ctrl'
      })
      .state('webUI', {
          url: '/web-ui',
          templateUrl: require('../views/web-ui.html'),
          controller: 'WebUICtrl as $ctrl'
      })
      .state('system', {
          url: '/system',
          templateUrl: require('../views/system.html'),
          controller: 'SystemCtrl as $ctrl'
      })
      .state('MQTTChannels', {
          url: '/MQTTChannels',
          templateUrl: require('../views/MQTTChannels.html'),
          controller: 'MQTTCtrl as $ctrl'
      })
      .state('accessLevel', {
          url: '/access-level',
          templateUrl: require('../views/access-level.html'),
          controller: 'AccessLevelCtrl as $ctrl'
      })
  //...........................................................................
    .state('devices', {
      url: '/devices',
      controller: 'DevicesCtrl as $ctrl',
      templateUrl: require('../views/devices.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure(
            [], 
            (require) => {
              let module = require('./controllers/devicesController.js');
              $ocLazyLoad.load({
                name: module.default.name
              })
              .then(() => {
                deferred.resolve(module);
              });
            },
            'devices'
          );
          return deferred.promise;
        }
      }
    })
  //...........................................................................
  .state('currentDevices', {
    url: '/devices/{deviceId}',
    controller: 'DevicesCtrl as $ctrl',
    templateUrl: require('../views/devices.html'),
    resolve: {
      ctrl: ($q, $ocLazyLoad) => {
        'ngInject';
        let deferred = $q.defer();
        require.ensure(
          [], 
          (require) => {
            let module = require('./controllers/devicesController.js');
            $ocLazyLoad.load({
              name: module.default.name
            })
            .then(() => {
              deferred.resolve(module);
            });
          },
          'devices'
        );
        return deferred.promise;
      }
    }
  })
//...........................................................................
    .state('widgets', {
      url: '/widgets',
      controller: 'WidgetsCtrl as $ctrl',
      templateUrl: require('../views/widgets.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure(
            [], 
            (require) => {
              let module = require('./controllers/widgetsController.js');
              $ocLazyLoad.load({
                name: module.default.name
              })
              .then(() => {
                deferred.resolve(module);
              });
            },
            'widgets'
          );
          return deferred.promise;
        }
      }
    })
  //...........................................................................
    .state('dashboards', {
      url: '/dashboards',
      controller: 'DashboardsCtrl as $ctrl',
      templateUrl: require('../views/dashboards.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure(
            [], 
            (require) => {
              let module = require('./controllers/dashboardsController.js');
              $ocLazyLoad.load({
                name: module.default.name
              })
              .then(() => {
                deferred.resolve(module);
              });
            },
            'dashboards'
          );
          return deferred.promise;
        }
      }
    })
  //...........................................................................
    .state('dashboard', {
      url: '/dashboards/{id}',
      controller: 'DashboardCtrl as $ctrl',
      templateUrl: require('../views/dashboard.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure(
            [], 
            (require) => {
              let module = require('./controllers/dashboardController.js');
              $ocLazyLoad.load({
                name: module.default.name
              })
              .then(() => {
                deferred.resolve(module);
              });
            },
            'dashboard'
          );
          return deferred.promise;
        }
      }
    })
  //...........................................................................
    .state('settings', {
      url: '/settings',
      controller: 'SettingCtrl as $ctrl',
      templateUrl: require('../views/settings.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure(
            [], 
            (require) => {
              let module = require('./controllers/settingController.js');
              $ocLazyLoad.load({
                name: module.default.name
              })
              .then(() => {
                deferred.resolve(module);
              });
            },
            'settings'
          );
          return deferred.promise;
        }
      }
    })
  //...........................................................................
    .state('login', {
      url: '/login/{id}',
      templateUrl: require('../views/login.html'),
      controller: 'LoginCtrl as $ctrl'
    })
  //...........................................................................
    .state('rules', {
      url: '/rules',
      controller: 'ScriptsCtrl as $ctrl',
      templateUrl: require('../views/scripts.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure(
            [], 
            (require) => {
              let module = require('./controllers/scriptsController.js');
              $ocLazyLoad.load({
                name: module.default.name
              })
              .then(() => {
                deferred.resolve(module);
              });
            },
            'rules'
          );
          return deferred.promise;
        }
      }
    })
  //...........................................................................
    .state('ruleEdit', {
      url: '/rules/edit/{path:.*}',
      templateUrl: require('../views/script.html'),
      controller: 'ScriptCtrl as $ctrl',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred_1 = $q.defer();
          let deferred_2 = $q.defer();
          require.ensure(
            [], 
            (require) => {
              let module_1 = require('./controllers/scriptController.js');
              $ocLazyLoad.load({
                name: module_1.default.name
              })
              .then(() => {
                deferred_1.resolve(module_1);
              });

              let module_2 = require('../lib/angular-ui-codemirror/src/ui-codemirror.js');
              $ocLazyLoad.load({
                name: 'ui.codemirror'
              })
              .then(() => {
                deferred_2.resolve(module_2);
              });
            },
            'rule-edit'
          );
          return $q.all([deferred_1.promise, deferred_2.promise]);
        }
      }
    })
  //...........................................................................
    .state('ruleNew', {
      url: '/rules/new',
      templateUrl: require('../views/script.html'),
      controller: 'ScriptCtrl as $ctrl',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred_1 = $q.defer();
          let deferred_2 = $q.defer();
          require.ensure(
            [], 
            (require) => {
              let module_1 = require('./controllers/scriptController.js');
              $ocLazyLoad.load({
                name: module_1.default.name
              })
              .then(() => {
                deferred_1.resolve(module_1);
              });

              let module_2 = require('../lib/angular-ui-codemirror/src/ui-codemirror.js');
              $ocLazyLoad.load({
                name: 'ui.codemirror'
              })
              .then(() => {
                deferred_2.resolve(module_2);
              });
            },
            'rule-new'
          );
          return $q.all([deferred_1.promise, deferred_2.promise]);
        }
      }
    })
  //...........................................................................
    .state('history', {
      url: '/history',
      controller: 'HistoryCtrl as $ctrl',
      templateUrl: require('../views/history.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred_1 = $q.defer();
          require.ensure(
            [],
            (require) => {
              let module_1 = require('./controllers/historyController.js');
              $ocLazyLoad.load({
                name: module_1.default.name,
              })
              .then(() => {
                deferred_1.resolve(module_1);
              });


            }, 
            'history'
          );
         return deferred_1.promise
      }}
    })
  //...........................................................................
    .state('historySample', {
      url: '/history/{device}/{control}/{start}/{end}',
      templateUrl: require('../views/history.html'),
      controller: 'HistoryCtrl as $ctrl',
      resolve: {
          /*load: ['$ocLazyLoad', function($ocLazyLoad) {
              return $ocLazyLoad.load(['plotly','historyController'])
          }],*/
        ctrl: ($q, $ocLazyLoad) => {
            'ngInject';
            let deferred_1 = $q.defer();
            require.ensure(
                [],
                (require) => {
                    let module_1 = require('./controllers/historyController.js');
                    $ocLazyLoad.load({
                            name: module_1.default.name,
                        })
                        .then(() => {
                            deferred_1.resolve(module_1);
                        });


                },
                'history'
            );
            return deferred_1.promise
        }
      }
    })
  //...........................................................................
    .state('configs', {
      url: '/configs',
      controller: 'ConfigsCtrl as $ctrl',
      templateUrl: require('../views/configs.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure(
            [], 
            (require) => {
              let module = require('./controllers/configsController.js');
              $ocLazyLoad.load({
                name: module.default.name
              })
              .then(() => {
                deferred.resolve(module);
              });
            },
            'configs'
          );
          return deferred.promise;
        }
      }
    })

  //...........................................................................
    .state('configEdit', {
      url: '/configs/edit/{path:.*}',
      controller: 'ConfigCtrl as $ctrl',
      templateUrl: require('../views/config.html'),
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure(
            [], 
            (require) => {
              let module = require('./controllers/configController.js');
              $ocLazyLoad.load({
                name: module.default.name
              })
              .then(() => {
                deferred.resolve(module);
                });
            },
            'config-edit'
          );
          return deferred.promise;
        }
      }
    });
};

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.routing', [uiRouter])
  .config(routing)
  .name;
