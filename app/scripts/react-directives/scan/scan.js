'use strict';

import React from 'react';
import ReactDOM from 'react-dom/client';
import DevicesPage from './deviceManager';
import { action, observable, makeAutoObservable, makeObservable } from "mobx";
import i18n from '../../i18n/react/config';

class GlobalErrorStore {
    error = ''

    constructor() {
        makeAutoObservable(this)
    }

    setError(msg) {
        this.error = msg
    }

    clearError() {
        this.setError('')
    }
}

class ScanningProgressStore {
    firstStart = true
    scanning = false
    progress = 0

    _requestScanning = false

    constructor() {
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
        if (this.scanning) {
            this.firstStart = false
        }
    }

    startScan() {
        this.firstStart = false
        if (this.scanning) {
            return;
        }
        this.scanning = true
        this.progress = 0
        this._requestScanning = true;
    }

    scanFailed() {
        this._requestScanning = false;
        this.scanning = false
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

class MqttStateStore {
    waitStartup = true
    deviceManagerIsAvailable = false

    constructor() {
        makeAutoObservable(this)
    }

    setDeviceManagerUnavailable() {
        this.setStartupComplete()
        this.deviceManagerIsAvailable = false
    }

    setDeviceManagerAvailable() {
        this.deviceManagerIsAvailable = true
    }

    setStartupComplete() {
        this.waitStartup = false
    }
}

// Expected props structure
// https://github.com/wirenboard/wb-device-manager/blob/main/README.md
function updateStores(dataToRender, scanStore, devicesStore, mqttStore, globalError) {
    try {
        const data = JSON.parse(dataToRender)
        if (data.error) {
            globalError.setError(data.error);
        }
        scanStore.setStateFromMqtt(data.scanning, data.progress)
        devicesStore.setDevices(data.devices)
        mqttStore.setStartupComplete()
    } catch (e) {
        // wb-device-manager could be stopped, so it will clear state topic and send null
    }
}

function scanDirective(DeviceManagerProxy, whenMqttReady, mqttClient) {
    'ngInject';

    return {
        restrict: 'E',
        link: function (scope, element) {
            if (scope.root) {
                scope.root.unmount();
            }
            scope.root = ReactDOM.createRoot(element[0]);
            scope.mqttStore = new MqttStateStore()
            scope.scanStore = new ScanningProgressStore()
            scope.devicesStore = new DevicesStore()
            scope.globalError = new GlobalErrorStore()

            const onScanFailed = (err) => {
                scope.scanStore.scanFailed()
                scope.globalError.setError(err)
            }

            const onStartScanning = () => {
                scope.scanStore.startScan()
                scope.globalError.clearError()
                DeviceManagerProxy.Scan().catch(onScanFailed);
            }

            const onDeviceManagerUnavailable = () => {
                scope.mqttStore.setDeviceManagerUnavailable()
                scope.globalError.setError(i18n.t('device-manager.errors.unavailable'))
            }

            const params = {
                mqtt: scope.mqttStore,
                scanning: scope.scanStore,
                devices: scope.devicesStore,
                errors: scope.globalError,
                onStartScanning: onStartScanning
            }
            scope.root.render(<DevicesPage {...params}/>);

            element.on('$destroy', function() {
                scope.root.unmount();
            });

            whenMqttReady()
                .then( () => DeviceManagerProxy.hasMethod('Scan') )
                .then((available) => {
                    if (available) {
                        mqttClient.addStickySubscription('/wb-device-manager/state', function(msg) {
                            updateStores(msg.payload, scope.scanStore, scope.devicesStore, scope.mqttStore, scope.globalError)
                        })
                        scope.mqttStore.setDeviceManagerAvailable()
                    } else {
                        onDeviceManagerUnavailable()
                    }
                })
                .catch(() => {
                    onDeviceManagerUnavailable()
                })
        }
    };
}

export default scanDirective;
