class SettingCtrl {
  constructor($scope, $rootScope, $window, mqttClient) {
    'ngInject';

    this.scope = $scope;
    this.mqttClient = mqttClient;
  }

//-----------------------------------------------------------------------------
  changeDefaultDashboard() {
    var uid = this.scope.dashboard ? this.scope.dashboard.uid : '';
    console.log('New default dashboard: ' + uid);
    this.mqttClient.send('/config/default_dashboard/uid', uid);
  };  
}

//-----------------------------------------------------------------------------
export default SettingCtrl;
