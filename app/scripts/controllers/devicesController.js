class DevicesCtrl {
  constructor($scope, DeviceData) {
    'ngInject';

    $scope.dev = devId => DeviceData.devices[devId];
    $scope.cell = id => DeviceData.cell(id);
    $scope.deviceIds = () => Object.keys(DeviceData.devices).sort();
  }
}

export default DevicesCtrl;
