'use strict';

angular.module('homeuiApp')
  .controller('SettingCtrl', ['$scope', '$rootScope', '$window', 'mqttClient', function($scope, $rootScope, $window, mqttClient){
    $scope.loginSettings = {};
    $scope.loginSettings.host = $window.localStorage['host'];
    $scope.loginSettings.port = $window.localStorage['port'];
    $scope.loginSettings.user = $window.localStorage['user'];
    $scope.loginSettings.password = $window.localStorage['password'];
    $scope.loginSettings.prefix = $window.localStorage['prefix'];

    if ($scope.loginSettings.user || $scope.loginSettings.password) {
      $scope.loginSettings.useCredentials = true;
    } else {
      $scope.loginSettings.useCredentials = false;
    }

    $scope.settings = {
      //~ setting0: { name: "IP", value: "148.251.208.199" },
      //~ setting4: { name: "Mosquitto Version", value: "1.4" },
      //~ setting5: { name: "Webfsd Version", value: "1.21" },
      //~ setting6: { name: "Controller Serial Nubmer", value: "199-251-148-208" },
      //~ setting7: { name: "Controller Version", value: "1.34" },
      //~ setting8: { name: "Debian Version", value: "7.8" }
    };

    // XXX: restore
    // $scope.$watch('data.defaults.dashboard', function(){
    //   if($scope.data.defaults.dashboard){
    //     $scope.$watch('data.dashboards.' + $scope.data.defaults.dashboard, function(){
    //       $scope.dashboard = $scope.data.dashboards[$scope.data.defaults.dashboard];
    //     });
    //   };
    // });

    $scope.updateLoginSettings = function(){
      $window.localStorage.setItem('host', $scope.loginSettings.host);
      $window.localStorage.setItem('port', $scope.loginSettings.port);

      $window.localStorage.setItem('prefix', $scope.loginSettings.prefix);

      if ($scope.loginSettings.useCredentials) {
        $window.localStorage.setItem('user', $scope.loginSettings.user);
        $window.localStorage.setItem('password', $scope.loginSettings.password);
      } else {
        $window.localStorage.setItem('user', '');
        $window.localStorage.setItem('password', '');
      }

      $window.location.reload();
    };

    $scope.changeDefaultDashboard = function(){
      var uid = $scope.dashboard ? $scope.dashboard.uid : '';
      console.log('New default dashboard: ' + uid);
      mqttClient.send('/config/default_dashboard/uid', uid);
    };
  }]);
