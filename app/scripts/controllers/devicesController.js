
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

        // if devices will not fit on the screen, 
        // all but the first will be minimized.
        this.shouldCollapseDevices = false;

        this.deviceIdsResult = [];

        $scope.dev = devId => DeviceData.devices[devId];
        $scope.cell = id => DeviceData.cell(id);
        $scope.deviceIdsColumns = () => {
            const devicesIdsList = Object.keys(DeviceData.devices).sort();
            const devicesIdsCount = devicesIdsList.length;

            let needReorderIdsInColumns = false;

            let devicesVisibility =  JSON.parse(window.localStorage.devicesVisibility)
            // devices are loaded dynamically by sockets, therefore
            // while browsing the page, their number may change.
            if(devicesIdsCount != devicesVisibility.devicesIdsCount){
                devicesIdsList.map((deviceId) => {
                    if(!devicesVisibility.devices.hasOwnProperty(deviceId)) {
                      devicesVisibility.devices[deviceId] = { isOpen : false };
                    }
                })

                needReorderIdsInColumns = true;
                devicesVisibility.devicesIdsCount = devicesIdsCount;
                window.localStorage.setItem('devicesVisibility', JSON.stringify(devicesVisibility));
            }

            const isFirstRender = devicesVisibility.isFirstRender;

            if(needReorderIdsInColumns || isFirstRender) {
              this.deviceIdsResult = this.getDevicesIdsInColumn(devicesIdsList)
            }

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

            return this.deviceIdsResult;
        }
    }

    getDevicesColumnsCount() {
      const containerWidth = document.getElementById("devices-list").offsetWidth;
      const devicePanelWidth = 390;
      const columnCount = Math.floor(containerWidth / devicePanelWidth );
      return columnCount;
    }

    getDevicesIdsInColumn(devicesIdsList) {
        const columnCount = this.getDevicesColumnsCount();
        let devicesIdsInColumns = [];

        for(let i = 0; i < columnCount; i++) {
            devicesIdsInColumns.push([]);
        }

        let index = 0;

        devicesIdsList.forEach((deviceId) => {
            if(index > columnCount - 1) {
              index = 0;
            }
            devicesIdsInColumns[index].push(deviceId);
            index += 1;
        })

        devicesIdsList = devicesIdsInColumns
        return devicesIdsList
    }

    createDevicesVisibilityObject() {
        if(!window.localStorage.devicesVisibility) {
          window.localStorage.setItem('devicesVisibility', JSON.stringify(
            {
              devices: {}, // { 'deviceId': { isOpen: bool }}
              isFirstRender: true,
              devicesIdsCount: 0
          }));
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
        const devicesVisibility =  JSON.parse(window.localStorage.devicesVisibility)
        devicesVisibility.devices[deviceId] = { 'isOpen' : isOpen };
        window.localStorage.setItem('devicesVisibility', JSON.stringify(devicesVisibility));
    }

    // return Object { isOpen: bool }, instead of bool value
    // to be used as model 'is-open' in devices.html view
    getDeviceVisibility(deviceId) {
        const devicesVisibility = JSON.parse(window.localStorage.devicesVisibility)
        return devicesVisibility.devices[deviceId];
    }

    changeDeviceVisibility(deviceId) {
        const devicesVisibility = JSON.parse(window.localStorage.devicesVisibility)
        devicesVisibility.devices[deviceId].isOpen = !devicesVisibility.devices[deviceId].isOpen
        window.localStorage.setItem('devicesVisibility', JSON.stringify(devicesVisibility));
    }

    setFirstRender(isFirst) {
        const devicesVisibility =  JSON.parse(window.localStorage.devicesVisibility)
        devicesVisibility.isFirstRender = isFirst
        window.localStorage.setItem('devicesVisibility', JSON.stringify(devicesVisibility));
    }

    // dynamic classes for arrow chevron in device panel-header
    getDeviceShevronClasses(deviceId) {
        const isOpen = this.getDeviceVisibility(deviceId).isOpen;
        return {
            'glyphicon-chevron-down': isOpen,
            'glyphicon-chevron-right':  !isOpen
        }
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
