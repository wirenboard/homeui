/**
 * Created by ozknemoy on 21.06.2017.
 */

export default class MQTTChannelsCtrl {

    constructor(DeviceData, uiConfig, $window) {
        'ngInject';

        this.DeviceData = DeviceData;

        const getDeviceIds = () => {
            const showSystemDevices = $window.localStorage['show-system-devices'] == 'yes';
            if (showSystemDevices) {
                return Object.keys(DeviceData.devices);
            }
            return Object.keys(DeviceData.devices).filter(deviceId => !DeviceData.devices[deviceId].isSystemDevice);
        };

        uiConfig.whenReady().then(data => {
            this.keys = getDeviceIds().sort();
        });
    }

    getRows() {
        if(!this.DeviceData || !this.keys) return [];
        this.rows = [];
        this.keys.forEach(key=> {
            if(this.DeviceData.devices[key].cellIds.length) {
                this.DeviceData.devices[key].cellIds.forEach(id=> {
                    this.rows.push(this.DeviceData.cell(id))
                });
            }
        });
        return this.rows;
    }
}
