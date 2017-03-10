import uiRouter from 'angular-ui-router';

function routing ($stateProvider,  $locationProvider, $urlRouterProvider) {
  // use the HTML5 History API
  $locationProvider.html5Mode(false);
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
      templateUrl: 'views/devices.html',
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
      templateUrl: 'views/widgets.html',
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
      templateUrl: 'views/dashboards.html',
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
      templateUrl: 'views/dashboard.html',
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
      templateUrl: 'views/settings.html',
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
      templateUrl: 'views/scripts.html',
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
    .state('scriptEdit', {
      url: '/scripts/edit/{path:.*}',
      templateUrl: 'views/script.html',
      controller: 'ScriptCtrl as $ctrl',
    })
  //...........................................................................
    .state('scriptNew', {
      url: '/scripts/new',
      templateUrl: 'views/script.html',
      controller: 'ScriptCtrl as $ctrl'
    })
  //...........................................................................
    .state('history', {
      url: '/history',
      controller: 'HistoryCtrl',
      templateUrl: 'views/history.html',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure([], function () {
            let module = require('./controllers/historyController.js');
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
    .state('history.sample', {
      url: '/history/{device}/{control}/{start}/{end}',
      templateUrl: 'views/history.html',
      controller: 'HistoryCtrl as $ctrl'
    })
  //...........................................................................
    .state('configs', {
      url: '/configs',
      controller: 'ConfigsCtrl as $ctrl',
      templateUrl: 'views/configs.html',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure([], function () {
            let module = require('./controllers/configsController.js');
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
    .state('configEdit', {
      url: '/configs/edit/{path:.*}',
      controller: 'ConfigCtrl as $ctrl',
      templateUrl: 'views/config.html',
      resolve: {
        ctrl: ($q, $ocLazyLoad) => {
          'ngInject';
          let deferred = $q.defer();
          require.ensure([], function () {
            let module = require('./controllers/configController.js');
            $ocLazyLoad.load({
              name: module.default.name
            }).then(function() {
              deferred.resolve(module);
              });
          });
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
