
class DevicesCtrl {
    constructor($scope, $state, $injector, DeviceData, handleData, rolesFactory) {
        'ngInject';

        this.haveRights = rolesFactory.checkRights(rolesFactory.ROLE_TWO);
        if(!this.haveRights) return;

        this.$state = $state;
        // object to keep devicesVisibility in State
        // fore keeping during the navigation
        if(!this.$state.devicesVisibility) this.$state.devicesVisibility = {};
        // if this flag is set, we will change the visibility of devices
        if(this.$state.devicesVisibility.firstRender === undefined) this.$state.devicesVisibility.firstRender = true;
        this.getDevicesVisibility = (deviceId) => this.$state.devicesVisibility[deviceId];

        this.handleData = handleData;

        // object which contain url params.
        const stateParams = $injector.get('$stateParams');
        const deviceIdFromUrl = stateParams.deviceId;

        if(deviceIdFromUrl) this.$state.devicesVisibility.firstRender = true;
        // if devices count > collapseDevicesAfter,
        // all devices except 1'st will be folded.
        const collapseDevicesAfter = 5;

        // dynamic classes for arrow chevron in panel-header
        $scope.getShevronClass = (deviceId) => {
          return {
            'glyphicon-chevron-down': this.getDevicesVisibility(deviceId).isOpen,
            'glyphicon-chevron-right':  !this.getDevicesVisibility(deviceId).isOpen
          }
        }
        $scope.dev = devId => DeviceData.devices[devId];
        $scope.cell = id => DeviceData.cell(id);
        $scope.deviceIds = () => {
          const devicesIdsList = Object.keys(DeviceData.devices).sort();

          devicesIdsList.map((deviceId) => {
            if(!this.$state.devicesVisibility.hasOwnProperty(deviceId)) {
              this.setDevicesVisibility(deviceId)
            }
          })

          // two flags to display what we need to custom show/collapse devices
          const haveDeviceFromUrl = DeviceData.devices.hasOwnProperty(deviceIdFromUrl);
          const tooManyDevices = devicesIdsList.length > collapseDevicesAfter;

          if(this.$state.devicesVisibility.firstRender && haveDeviceFromUrl) {
              devicesIdsList.map((deviceId) => {
                this.$state.devicesVisibility[deviceId].isOpen = deviceIdFromUrl === deviceId ? true : false;
              })
              this.$state.devicesVisibility.firstRender = false;
          }
          if(this.$state.devicesVisibility.firstRender && tooManyDevices) {
              devicesIdsList.map((deviceId, index) => {
                this.$state.devicesVisibility[deviceId].isOpen = tooManyDevices ? index === 0 ? true : false : true;
              })
              this.$state.devicesVisibility.firstRender = false;
          }

          return devicesIdsList;
      }
    }

    setDevicesVisibility(deviceId) {
      this.$state.devicesVisibility[deviceId] = { isOpen: false }
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
