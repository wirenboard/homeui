import uiRouter from 'angular-ui-router';

function routing ($stateProvider,  $locationProvider, $urlRouterProvider) {
  // use the HTML5 History API
  $locationProvider.html5Mode(true);
  $locationProvider.hashPrefix('!');
  $urlRouterProvider.otherwise('/');

  $stateProvider
  //...........................................................................
    .state('home', {
      url: '/',
      templateUrl: 'views/home.html',
      controller: 'HomeCtrl as $ctrl'
    })
  //...........................................................................
    .state('devices', {
      url: '/devices',
      controller: 'DevicesCtrl as $ctrl',
      templateProvider: ($q) => {
        'ngInject';
        let deferred = $q.defer();
        require.ensure(['../views/devices.html'], function () {
            let template = require('../views/devices.html');
            deferred.resolve(template);
        });
        return deferred.promise;
      },
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure([], function () {
            let module = require('./controllers/devicesController.js');
            $ocLazyLoad.load({
              name: module.default.name
            });
            deferred.resolve(module);
          });
          return deferred.promise;
        }
      }
    })
  //...........................................................................
    .state('widgets', {
      url: '/widgets',
      controller: 'WidgetsCtrl as $ctrl',
      templateProvider: ($q) => {
        'ngInject';
        let deferred = $q.defer();
        require.ensure(['../views/widgets.html'], function () {
            let template = require('../views/widgets.html');
            deferred.resolve(template);
        });
        return deferred.promise;
      },
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure([], function () {
            let module = require('./controllers/widgetsController.js');
            $ocLazyLoad.load({
              name: module.default.name
            });
            deferred.resolve(module);
          });
          return deferred.promise;
        }
      }
    })
  //...........................................................................
    .state('dashboards', {
      url: '/dashboards',
      controller: 'DashboardsCtrl as $ctrl',
      templateProvider: ($q) => {
        'ngInject';
        let deferred = $q.defer();
        require.ensure(['../views/dashboards.html'], function () {
            let template = require('../views/dashboards.html');
            deferred.resolve(template);
        });
        return deferred.promise;
      },
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure([], function () {
            let module = require('./controllers/dashboardsController.js');
            $ocLazyLoad.load({
              name: module.default.name
            });
            deferred.resolve(module);
          });
          return deferred.promise;
        }
      }
    })
  //...........................................................................
    .state('dashboard', {
      url: '/dashboards/{id}',
      controller: 'DashboardCtrl as $ctrl',
      templateProvider: ($q) => {
        'ngInject';
        let deferred = $q.defer();
        require.ensure(['../views/dashboard.html'], function () {
            let template = require('../views/dashboard.html');
            deferred.resolve(template);
        });
        return deferred.promise;
      },
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure([], function () {
            let module = require('./controllers/dashboardController.js');
            $ocLazyLoad.load({
              name: module.default.name
            });
            deferred.resolve(module);
          });
          return deferred.promise;
        }
      }
    })
  //...........................................................................
    .state('settings', {
      url: '/settings',
      controller: 'SettingCtrl as $ctrl',
      templateProvider: ($q) => {
        'ngInject';
        let deferred = $q.defer();
        require.ensure(['../views/settings.html'], function () {
            let template = require('../views/settings.html');
            deferred.resolve(template);
        });
        return deferred.promise;
      },
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure([], function () {
            let module = require('./controllers/settingController.js');
            $ocLazyLoad.load({
              name: module.default.name
            });
            deferred.resolve(module);
          });
          return deferred.promise;
        }
      }
    })
  //...........................................................................
    .state('login', {
      url: '/login/{id}',
      templateUrl: 'views/login.html',
      controller: 'LoginCtrl as $ctrl'
    })
  //...........................................................................
    .state('scripts', {
      url: '/scripts',
      controller: 'ScriptsCtrl',
      templateProvider: ($q) => {
        'ngInject';
        let deferred = $q.defer();
        require.ensure(['../views/scripts.html'], function () {
            let template = require('../views/scripts.html');
            deferred.resolve(template);
        });
        return deferred.promise;
      },
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure([], function () {
            let module = require('./controllers/scriptsController.js');
            $ocLazyLoad.load({
              name: module.default.name
            });
            deferred.resolve(module);
          });
          return deferred.promise;
        }
      }
    })
  //...........................................................................
    .state('scripts.edit', {
      url: '/scripts/edit/{path}',
      templateUrl: 'views/script.html',
      controller: 'ScriptCtrl as $ctrl'
    })
  //...........................................................................
    .state('scripts.new', {
      url: '/',
      templateUrl: 'views/script.html',
      controller: 'ScriptCtrl as $ctrl'
    })
  //...........................................................................
    .state('history', {
      url: '/history',
      templateUrl: 'views/history.html',
      controller: 'HistoryCtrl'
    })
  //...........................................................................
    .state('history.sample', {
      url: '/history/{device}/{control}/{start}/{end}',
      templateUrl: 'views/history.html',
      controller: 'HistoryCtrl as $ctrl'
    })
  //...........................................................................
    .state('configs', {
      url: '/configs',
      templateUrl: 'views/configs.html',
      controller: 'ConfigsCtrl as $ctrl'
    })
  //...........................................................................
    .state('configs.edit', {
      url: '/configs/edit/{path}',
      templateUrl: 'views/config.html',
      controller: 'ConfigCtrl as $ctrl'
    });
};

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.routing', [uiRouter])
  .config(routing)
  .name;
