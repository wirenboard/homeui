'use strict';

angular.module('homeuiApp')
  .controller('SettingCtrl', ['$scope', '$rootScope', 'CommonСode', 'mqttClient', function($scope, $rootScope, CommonСode, mqttClient){
    $scope.settings = {
                        setting0: { name: "IP", value: "148.251.208.199" },
                        setting1: { name: "Host", value: "mqtt.carbonfay.ru" },
                        setting2: { name: "WSS Port", value: "18883" },
                        setting3: { name: "Client ID", value: "cls123" },
                        setting4: { name: "Mosquitto Version", value: "1.4" },
                        setting5: { name: "Webfsd Version", value: "1.21" },
                        setting6: { name: "Controller Serial Nubmer", value: "199-251-148-208" },
                        setting7: { name: "Controller Version", value: "1.34" },
                        setting8: { name: "Debian Version", value: "7.8" }
                      };
    $scope.data = CommonСode.data;
    $scope.dashboard = $scope.data.dashboards[$scope.data.defaults.dashboard];

    $scope.changeDefaultDashboard = function(){
      console.log('New default dashboard: ' + $scope.dashboard.uid);
      mqttClient.send('/config/default_dashboard/uid', $scope.dashboard.uid);
    };
  }]);