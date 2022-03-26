
class DevicesCtrl {
    constructor($scope, $state, $injector, DeviceData, handleData, rolesFactory, historyUrlService, $locale) {
        'ngInject';

        this.haveRights = rolesFactory.checkRights(rolesFactory.ROLE_TWO);
        if(!this.haveRights) return;

        this.$state = $state;
        this.handleData = handleData;
        this.DeviceData = DeviceData;
        this.historyUrlService = historyUrlService;

        // will create object to keep devices open/close condition
        // in localeStorage, if it's not there.
        this.createDevicesVisibilityObject();

        const deviceIdFromUrl = this.parseDeviceIdFromUrl($injector);

        // this listener needed to redraw columns and devices on window resize.
        $(window).resize(() => { this.$state.devicesIdsCount = 0 });

        $scope.$locale = $locale;
        $scope.dev = devId => DeviceData.devices[devId];
        $scope.cell = id => DeviceData.cell(id);
        $scope.devicesCount = () => Object.keys(DeviceData.devices).length,
        $scope.deviceIdsInColumns = () => {
            const devicesIdsList = Object.keys(DeviceData.devices).sort();
            const devicesIdsCount = devicesIdsList.length;

            if(devicesIdsCount <= 0) return;

            // devices are loaded dynamically by sockets, therefore
            // their number may change. If there is a new device,
            // it is entered into the devicesVisibility object, collapsed - by default.
            if(devicesIdsCount != this.$state.devicesIdsCount) {
                let devicesVisibility =  JSON.parse(window.localStorage.devicesVisibility);

                // check localStorage for outdated (deleted) devices
                Object.keys(devicesVisibility.devices).forEach((deviceId) => {
                  if(!devicesIdsList.includes(deviceId)) {
                    delete devicesVisibility.devices[deviceId]
                  }
                })

                // add new devices to localStorage
                devicesIdsList.forEach((deviceId) => {
                    if(!devicesVisibility.devices.hasOwnProperty(deviceId)) {
                        devicesVisibility.devices[deviceId] = { isOpen : false };
                    }
                })

                devicesVisibility.isFirstRender = true;
                this.$state.devicesIdsCount = devicesIdsCount;

                window.localStorage.setItem('devicesVisibility', JSON.stringify(devicesVisibility));
            }

            let devicesVisibility =  JSON.parse(window.localStorage.devicesVisibility);

            // if there are devices to display, split them into columns
            // and determine their minimized / expanded state.
            if(devicesVisibility.isFirstRender) {
                this.$state.deviceIdsIntoColumns = this.splitDevicesIdsIntoColumns(devicesIdsList);

                // if url contain deviceId, this device will be open,
                // all other devices will be folded.
                if(deviceIdFromUrl && DeviceData.devices.hasOwnProperty(deviceIdFromUrl)) {
                    devicesIdsList.map((deviceId) => {
                        const isOpen = deviceIdFromUrl === deviceId;
                        devicesVisibility.devices[deviceId] = { 'isOpen' : isOpen };
                    })
                }
                // display expanded only devices, that fit on the screen.
                else {
                  const containerHeight = document.getElementById("page-wrapper").offsetHeight - 34;
                  const collapsedPanelHeight = 60;
                  const panelRowHeight = 30;
                  const panelContentPadding = 20;

                  this.$state.deviceIdsIntoColumns.forEach((columnOfIds) => {
                      let availableSpace = containerHeight - (columnOfIds.length * collapsedPanelHeight);

                      columnOfIds.forEach((deviceId) => {
                          devicesVisibility.devices[deviceId].isOpen = false;

                          if (availableSpace > 0) {
                            const deviceRowCount = DeviceData.devices[deviceId].cellIds.length;
                            const deviceInnerHeight = panelContentPadding + (deviceRowCount * panelRowHeight);

                            if(availableSpace - deviceInnerHeight > 0) {
                                availableSpace -= deviceInnerHeight;
                                devicesVisibility.devices[deviceId].isOpen = true;
                            }
                          }
                      });
                  });
                }

                devicesVisibility.isFirstRender = false;
                window.localStorage.setItem('devicesVisibility', JSON.stringify(devicesVisibility));
            }

            return this.$state.deviceIdsIntoColumns || [];
        }
    }

    getDevicesColumnsCount() {
      const containerWidth = document.getElementById("devices-list").offsetWidth;
      const devicePanelWidth = 390;
      const columnCount = Math.floor(containerWidth / devicePanelWidth );
      return columnCount || 1;
    }

    splitDevicesIdsIntoColumns(devicesIdsList) {
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

        return devicesIdsInColumns
    }

    createDevicesVisibilityObject() {
        if(!window.localStorage.devicesVisibility) {
          window.localStorage.setItem('devicesVisibility', JSON.stringify(
            {
              devices: {}, // { 'deviceId': { isOpen: bool }}
              isFirstRender: true
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

    // return Object { isOpen: bool }, instead of bool value
    // to be used as model 'is-open' in devices.html view
    getDeviceVisibility(deviceId) {
        const devicesVisibility = JSON.parse(window.localStorage.devicesVisibility)
        return devicesVisibility.devices[deviceId];
    }

    invertDeviceVisibility(deviceId) {
        const devicesVisibility = JSON.parse(window.localStorage.devicesVisibility);
        devicesVisibility.devices[deviceId].isOpen = !devicesVisibility.devices[deviceId].isOpen;
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

    deleteDevice(deviceId) {
        this.DeviceData.deleteDevice(deviceId);
    }

    redirect(contr) {
        var [device,control] = contr.split('/');
        this.$state.go('history.sample', { data: this.historyUrlService.encodeControl(device, control) })
    }
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.devices', [])
    .controller('DevicesCtrl', DevicesCtrl);
