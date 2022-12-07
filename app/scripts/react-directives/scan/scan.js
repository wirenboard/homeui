'use strict';

import React from 'react';
import ReactDOM from 'react-dom/client';
import DevicesPage from './deviceManager';
import { action, observable, makeAutoObservable, makeObservable } from "mobx";
import i18n from '../../i18n/react/config';

class ScanningProgressStore {
    scanning = false
    progress = 0

    _requestScanning = false
    _deviceManagerProxy
    _errorsService

    constructor(deviceManagerProxy, errorsService) {
        this._deviceManagerProxy = deviceManagerProxy
        this._errorsService = errorsService

        makeObservable(this,{
            scanning: observable,
            progress: observable,
            setStateFromMqtt: action,
            startScan: action,
            scanFailed: action.bound
        })
    }

    setStateFromMqtt(isScanning, scanProgress) {
        if (this.scanning) {
            this._requestScanning = false
        }
        this.scanning = this._requestScanning ? true : isScanning
        this.progress = scanProgress
    }

    startScan() {
        if (this.scanning) {
            return;
        }
        this.scanning = true
        this.progress = 0
        this._requestScanning = true;
        this._deviceManagerProxy.Scan().catch(this.scanFailed);
    }

    scanFailed(err) {
        this._requestScanning = false;
        this.scanning = false
        this.errorsService.catch('scan.errors.scan')(err);
    }
}

class DevicesStore {
    devices = []

    constructor() {
        makeAutoObservable(this)
    }

    setDevices(devicesList) {
        if (Array.isArray(devicesList)) {
            this.devices = devicesList
        }
    }
}

// Expected props structure
//
// {
//   "progress": 15,
//   "scanning": false,
//   "error": null,
//   "devices": [
//     {
//       "uuid": "05a822a1-f326-3dbe-9dad-56921ecfa0f1",
//       "port": {
//         "path": "/dev/ttyRS485-1"
//       },
//       "title": "Scanned device",
//       "sn": "4264834454",
//       "online": true,
//       "poll": false,
//       "bootloader_mode": false,
//       "error": null,
//       "last_seen": 1670410647,
//       "device_signature": "WBMD3",
//       "fw_signature": "mdm3",
//       "cfg": {
//         "slave_id": 3,
//         "baud_rate": 9600,
//         "parity": "N",
//         "data_bits": 8,
//         "stop_bits": 2
//       },
//       "fw": {
//         "version": "3.3.1",
//         "update": {
//           "progress": 0,
//           "error": null,
//           "available_fw": null
//         }
//       }
//     },
//     ...
//   ]
// }
function updateStores(scope, dataToRender, errorsService) {
    try {
        const data = JSON.parse(dataToRender)
        if (data.error) {
            errorsService.catch(i18n.t('device-manager.errors.common'))(data.error);
        }
        scope.scanStore.setStateFromMqtt(data.scanning, data.progress)
        scope.devicesStore.setDevices(data.devices)
    } catch (e) {
        // wb-device-manager could be stopped, so it will clear state topic and send null
    }
}

function scanDirective(DeviceManagerProxy, errors) {
    'ngInject';

    return {
        restrict: 'E',
        scope: {
            data: '='
        },
        link: function (scope, element) {
            if (scope.root) {
                scope.root.unmount();
            }
            scope.root = ReactDOM.createRoot(element[0]);
            scope.scanStore = new ScanningProgressStore(DeviceManagerProxy, errors)
            scope.devicesStore = new DevicesStore()
            updateStores(scope, scope.data, errors)
            scope.root.render(<DevicesPage errors={scope.errorStore} scanning={scope.scanStore} devices={scope.devicesStore}/>);

            scope.watcher = scope.$watch('data', function (newValue, oldValue) {
                if (!angular.equals(newValue, oldValue)) {
                    updateStores(scope, newValue, errors)
                }
            }, true);

            element.on('$destroy', function() {
                scope.root.unmount();
            });
            scope.$on('$destroy', function() {
                scope.watcher();
            });
        }
    };
}

export default scanDirective;
