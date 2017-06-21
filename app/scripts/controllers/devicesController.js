
class DevicesCtrl {
    constructor($scope, $state, DeviceData, handleData) {
        'ngInject';

        this.$state = $state;
        this.handleData = handleData;
        $scope.dev = devId => DeviceData.devices[devId];
        $scope.cell = id => DeviceData.cell(id);
        $scope.deviceIds = () => Object.keys(DeviceData.devices).sort();

    }

    copy(device, control) {
        if (control) this.handleData.copyToClipboard(control)
    }

    redirect(contr) {
        var [device,control] = contr.split('/');
        this.$state.go('historySample', {device, control, start: '-', end: '-'})
    }
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.devices', [])
    .controller('DevicesCtrl', DevicesCtrl);
