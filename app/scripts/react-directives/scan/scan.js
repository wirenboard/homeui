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
        this._errorsService.hideError()
        this.scanning = true
        this.progress = 0
        this._requestScanning = true;
        this._deviceManagerProxy.Scan().catch(this.scanFailed);
    }

    scanFailed(err) {
        this._requestScanning = false;
        this.scanning = false
        this._errorsService.catch('scan.errors.scan')(err);
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
// https://github.com/wirenboard/wb-device-manager/blob/main/README.md
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
