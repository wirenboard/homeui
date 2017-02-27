function routing ($routeProvider,  $locationProvider, JSONEditorProvider, DumbTemplateProvider) {
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

  $routeProvider
    .when('/', {
      templateUrl: 'views/home.html',
      controller: 'HomeCtrl'
    })
    .when('/devices', {
      templateUrl: 'views/devices.html',
      controller: 'DevicesCtrl'
    })
    .when('/widgets', {
      templateUrl: 'views/widgets.html',
      controller: 'WidgetsCtrl'
    })
    .when('/dashboards', {
      templateUrl: 'views/dashboards.html',
      controller: 'DashboardsCtrl'
    })
    .when('/dashboards/:id', {
      templateUrl: 'views/dashboard.html',
      controller: 'DashboardCtrl'
    })
    .when('/settings', {
      templateUrl: 'views/settings.html',
      controller: 'SettingCtrl'
    })
    .when('/login/:id',{
      templateUrl: 'views/login.html',
      controller: 'LoginCtrl'
    })
    .when('/scripts', {
      templateUrl: 'views/scripts.html',
      controller: 'ScriptsCtrl'
    })
    .when('/scripts/edit/:path*', {
      templateUrl: 'views/script.html',
      controller: 'ScriptCtrl'
    })
    .when('/scripts/new', {
      templateUrl: 'views/script.html',
      controller: 'ScriptCtrl'
    })
    .when('/history', {
      templateUrl: 'views/history.html',
      controller: 'HistoryCtrl'
    })
    .when('/history/:device/:control/:start/:end', {
      templateUrl: 'views/history.html',
      controller: 'HistoryCtrl'
    })
    .when('/configs', {
      templateUrl: 'views/configs.html',
      controller: 'ConfigsCtrl'
    })
    .when('/configs/edit/:path*', {
      templateUrl: 'views/config.html',
      controller: 'ConfigCtrl'
    })
    .otherwise({
      redirectTo: '/'
    });

  // use the HTML5 History API
  $locationProvider.html5Mode(true).hashPrefix('!');
};

export default routing;
