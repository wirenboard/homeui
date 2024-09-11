class DevicesCtrl {
  constructor($injector, $locale, DeviceData, rolesFactory, $scope) {
    'ngInject';

    this.haveRights = rolesFactory.checkRights(rolesFactory.ROLE_TWO);
    if (!this.haveRights) {
      return;
    }

    this.locale = $locale.id;
    $scope.locale = this.locale;
    this.deviceData = DeviceData;
    this.stateParams = $injector.get('$stateParams');

    this.createDevicesVisibilityObject();

    // this listener needed to redraw columns and devices on window width change
    $(window).resize(() => {
      if (window.innerWidth !== this.windowWidth) {
        this.windowWidth = window.innerWidth;
        this.devicesIdsCount = null;
      }
    });
  }

  getColumns() {
    const devicesIdsList = Array.from(Object.values(this.deviceData.devices))
      .sort((a, b) => a.getName(this.locale).localeCompare(b.getName(this.locale)))
      .map(device => device.id);

    // devices are loaded dynamically by sockets, their number may change
    if (this.devicesIdsCount !== devicesIdsList.length) {
      const devicesVisibility = this.getVisibilityObject();
      this.devicesIdsCount = devicesIdsList.length;
      this.deviceIdsIntoColumns = this.splitDevicesIdsIntoColumns(devicesIdsList);
      const deviceIdFromUrl = this.stateParams.deviceId;

      devicesIdsList.forEach(deviceId => {
        // add new devices to localStorage
        if (!devicesVisibility.devices[deviceId]) {
          devicesVisibility.devices[deviceId] = { isOpen: true };
        }

        // if there is a device in url, then open only it
        if (deviceIdFromUrl && this.deviceData.devices[deviceIdFromUrl]) {
          devicesVisibility.devices[deviceId].isOpen = deviceIdFromUrl === deviceId;
        }
      });

      localStorage.setItem('visibleDevices', JSON.stringify(devicesVisibility));
    }

    return this.deviceIdsIntoColumns || [];
  }

  getDevicesColumnsCount() {
    const containerWidth = document.getElementById('devices-list').offsetWidth;
    const devicePanelWidth = 390;
    const columnCount = Math.floor(containerWidth / devicePanelWidth);
    return columnCount || 1;
  }

  splitDevicesIdsIntoColumns(devicesIdsList) {
    const columnCount = this.getDevicesColumnsCount();
    const devicesIdsInColumns = Array.from({ length: columnCount }, () => []);

    let index = 0;
    devicesIdsList.forEach(deviceId => {
      devicesIdsInColumns[index].push(deviceId);
      index = (index + 1) % columnCount;
    });

    return devicesIdsInColumns;
  }

  // create object to keep devices open/close condition in localeStorage, if it's not there
  createDevicesVisibilityObject() {
    if (!this.getVisibilityObject()) {
      localStorage.setItem('visibleDevices', JSON.stringify({ devices: {} }));
    }
  }

  getVisibilityObject() {
    return JSON.parse(localStorage.getItem('visibleDevices'));
  }

  // return Object { isOpen: bool }, instead of bool value
  // to be used as model 'is-open' in devices.html view
  getDeviceVisibility(deviceId) {
    return this.getVisibilityObject().devices[deviceId];
  }

  toggleDeviceVisibility(deviceId) {
    const devicesVisibility = this.getVisibilityObject();
    devicesVisibility.devices[deviceId].isOpen = !devicesVisibility.devices[deviceId].isOpen;
    localStorage.setItem('visibleDevices', JSON.stringify(devicesVisibility));
  }

  getCell(id) {
    return this.deviceData.cell(id);
  }

  getDevice(id) {
    return this.deviceData.devices[id];
  }

  getDevicesCount() {
    return Object.keys(this.deviceData.devices).length;
  }

  deleteDevice(deviceId) {
    this.deviceData.deleteDevice(deviceId);
  }
}

//-----------------------------------------------------------------------------
export default angular.module('homeuiApp.devices', []).controller('DevicesCtrl', DevicesCtrl);
