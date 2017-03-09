import uiRouter from 'angular-ui-router';

function routing ($stateProvider,  $locationProvider, $urlRouterProvider) {
  // use the HTML5 History API
  $locationProvider.html5Mode(true).hashPrefix('!');

  $stateProvider
    .state('home', {
      url: '/',
      templateUrl: 'views/home.html',
      controller: 'HomeCtrl as $ctrl'
    })
    .state('devices', {
      url: '/devices',
      templateUrl: 'views/devices.html',
      controller: 'DevicesCtrl as $ctrl'
    })
    .state('widgets', {
      url: '/widgets',
      templateUrl: 'views/widgets.html',
      controller: 'WidgetsCtrl as $ctrl'
    })
    .state('dashboards', {
      url: '/dashboards',
      templateUrl: 'views/dashboards.html',
      controller: 'DashboardsCtrl as $ctrl'
    })
    .state('dashboard', {
      url: '/dashboards/{id}',
      templateUrl: 'views/dashboard.html',
      controller: 'DashboardCtrl as $ctrl'
    })
    .state('settings', {
      url: '/settings',
      templateUrl: 'views/settings.html',
      controller: 'SettingCtrl as $ctrl'
    })
    .state('login', {
      url: '/login/{id}',
      templateUrl: 'views/login.html',
      controller: 'LoginCtrl as $ctrl'
    })
    .state('scripts', {
      url: '/scripts',
      templateUrl: 'views/scripts.html',
      controller: 'ScriptsCtrl'
    })
    .state('scripts.edit', {
      url: '/scripts/edit/{path}',
      templateUrl: 'views/script.html',
      controller: 'ScriptCtrl as $ctrl'
    })
    .state('scripts.new', {
      url: '/',
      templateUrl: 'views/script.html',
      controller: 'ScriptCtrl as $ctrl'
    })
    .state('history', {
      url: '/history',
      templateUrl: 'views/history.html',
      controller: 'HistoryCtrl'
    })
    .state('history.sample', {
      url: '/history/{device}/{control}/{start}/{end}',
      templateUrl: 'views/history.html',
      controller: 'HistoryCtrl as $ctrl'
    })
    .state('configs', {
      url: '/configs',
      templateUrl: 'views/configs.html',
      controller: 'ConfigsCtrl as $ctrl'
    })
    .state('configs.edit', {
      url: '/configs/edit/{path}',
      templateUrl: 'views/config.html',
      controller: 'ConfigCtrl as $ctrl'
    });

  $urlRouterProvider.otherwise('/');
};

export default angular
  .module('homeuiApp.routing', [uiRouter])
  .config(routing)
  .name;
