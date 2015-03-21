'use strict';

angular.module('homeuiApp')
  .controller('SettingCtrl', ['$scope', '$rootScope', '$window', 'CommonСode', 'mqttClient', function($scope, $rootScope, $window, CommonСode, mqttClient){
    $scope.loginSettings = {};
    $scope.loginSettings.host = $window.localStorage['host'];
    $scope.loginSettings.port = $window.localStorage['port'];
    $scope.loginSettings.user = $window.localStorage['user'];
    $scope.loginSettings.password = $window.localStorage['password'];
    $scope.loginSettings.prefix = $window.localStorage['prefix'];

    $scope.settings = {
                        setting0: { name: "IP", value: "148.251.208.199" },
                        setting4: { name: "Mosquitto Version", value: "1.4" },
                        setting5: { name: "Webfsd Version", value: "1.21" },
                        setting6: { name: "Controller Serial Nubmer", value: "199-251-148-208" },
                        setting7: { name: "Controller Version", value: "1.34" },
                        setting8: { name: "Debian Version", value: "7.8" }
                      };
    $scope.data = CommonСode.data;

    $scope.$watch('data.defaults.dashboard', function(){
      $scope.$watch('data.dashboards.' + $scope.data.defaults.dashboard, function(){
        $scope.dashboard = $scope.data.dashboards[$scope.data.defaults.dashboard];
      });
    });

    $scope.updateLoginSettings = function(){
      if($scope.loginSettings.host) $window.localStorage.setItem('host', $scope.loginSettings.host);
      if($scope.loginSettings.port) $window.localStorage.setItem('port', $scope.loginSettings.port);
      if($scope.loginSettings.user) $window.localStorage.setItem('user', $scope.loginSettings.user);
      if($scope.loginSettings.password) $window.localStorage.setItem('password', $scope.loginSettings.password);
      if($scope.loginSettings.prefix) $window.localStorage.setItem('prefix', $scope.loginSettings.prefix);
      CommonСode.tryConnect();
    };

    $scope.changeDefaultDashboard = function(){
      console.log('New default dashboard: ' + $scope.dashboard.uid);
      mqttClient.send('/config/default_dashboard/uid', $scope.dashboard.uid);
    };
  }]);