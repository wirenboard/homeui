
class DevicesCtrl {
    constructor($scope, $state, $injector, DeviceData, handleData, rolesFactory) {
        'ngInject';

        this.haveRights = rolesFactory.checkRights(rolesFactory.ROLE_TWO);
        if(!this.haveRights) return;

        this.$state = $state;
        this.handleData = handleData;

        // will create object to keep devices open/close condition in State
        // fore keeping during the navigation, if it's not there
        this.createDevicesVisibilityObject();

        // if url contain deviceId, this device will be open,
        // all other devices will be folded.
        const deviceIdFromUrl = this.parseDeviceIdFromUrl($injector);

        // if devices count > collapseDevicesAfter,
        // all devices except 1'st will be folded.
        const collapseDevicesAfter = 10;

        $scope.dev = devId => DeviceData.devices[devId];
        $scope.cell = id => DeviceData.cell(id);
        $scope.deviceIds = () => {
            const devicesIdsList = Object.keys(DeviceData.devices).sort();
            const devicesIdsCount = devicesIdsList.length;

            // devices are loaded dynamically by sockets, therefore
            // while browsing the page, their number may change.
            if(devicesIdsCount != this.$state.devicesVisibility.devicesIdsCount){
                devicesIdsList.map((deviceId) => {
                    if(!this.$state.devicesVisibility.hasOwnProperty(deviceId)) {
                        this.setDeviceVisibility(deviceId, false);
                    }
                })

                this.$state.devicesVisibility.devicesIdsCount = devicesIdsCount;
            }

            const isFirstRender = this.$state.devicesVisibility.isFirstRender;

            if(isFirstRender && devicesIdsCount) {
                const haveDeviceFromUrl = DeviceData.devices.hasOwnProperty(deviceIdFromUrl);
                const tooManyDevices = devicesIdsCount > collapseDevicesAfter;

                if(haveDeviceFromUrl) {
                    devicesIdsList.map((deviceId) => {
                        const isOpen = deviceIdFromUrl === deviceId ? true : false;
                        this.setDeviceVisibility(deviceId, isOpen);
                    })
                }
                else if(tooManyDevices) {
                    devicesIdsList.map((deviceId, index) => {
                        const isOpen = tooManyDevices ? index === 0 ? true : false : true;
                        this.setDeviceVisibility(deviceId, isOpen);
                    })
                }
                else {
                    devicesIdsList.map((deviceId) => {
                        this.setDeviceVisibility(deviceId, true);
                    })
                }

                this.setFirstRender(false);
            }

            return devicesIdsList;
        }
    }

    createDevicesVisibilityObject() {
        if(!this.$state.devicesVisibility) {
            this.$state.devicesVisibility = {
                devices: {}, // { 'deviceId': { isOpen: bool }}
                isFirstRender: true,
                devicesIdsCount: 0
            };
        }
    }

    parseDeviceIdFromUrl($injector) {
        const deviceIdFromUrl = $injector.get('$stateParams').deviceId;

        // if URL contains deviceId we must display it panel open,
        // so change the flag isFirstRender to true
        if(deviceIdFromUrl) this.setFirstRender(true);

        return deviceIdFromUrl;
    }

    setDeviceVisibility(deviceId, isOpen) {
        this.$state.devicesVisibility.devices[deviceId] = {'isOpen' : isOpen};
    }

    // return Object { isOpen: bool }, instead of bool value
    // to be used as model 'is-open' in devices.html view
    getDeviceVisibility(deviceId) {
        return this.$state.devicesVisibility.devices[deviceId];
    }

    setFirstRender(isFirst) {
        this.$state.devicesVisibility.isFirstRender = isFirst;
    }

    // dynamic classes for arrow chevron in device panel-header
    getDeviceShevronClasses(deviceId) {
        const isOpen = this.getDeviceVisibility(deviceId).isOpen;
        return {
            'glyphicon-chevron-down': isOpen,
            'glyphicon-chevron-right':  !isOpen
        }
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
