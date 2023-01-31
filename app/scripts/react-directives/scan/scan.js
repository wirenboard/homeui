'use strict';

import ReactDOM from 'react-dom/client';
import CreateDevicesPage from './deviceManager';
import { action, observable, makeAutoObservable, makeObservable } from "mobx";
import i18n from '../../i18n/react/config';

class GlobalErrorStore {
    error = ''
    
    constructor() {
        makeAutoObservable(this)
    }
    
    // Error can be a string or object
    // {
    //    "id": "com.wb.device_manager.generic_error"
    //    "message": "Internal error. Check logs for more info"
    //    "metadata": {...}
    // }
    // where "id" - unique id of error,
    //       "message" - human readable message for the error,
    //       "metadata" - object with specific error parameters
    setError(error) {
        var msg = '';
        if (typeof error === "string") {
            msg = error;
        } else if (typeof error === "object") {
            if (error.hasOwnProperty('id')) {
                if (
                    error.id === "com.wb.device_manager.failed_to_scan_error" &&
                    error.metadata &&
                    error.metadata.failed_ports
                ) {
                    msg = i18n.t(error.id, {
                        defaultValue: error.message,
                        replace: {
                            failed_ports: error.metadata.failed_ports.join(", "),
                        },
                        interpolation: { escapeValue: false },
                    });
                } else {
                    msg = i18n.t(error.id, error.message);
                }
            } else {
                msg = error.message;
            }
        }
        this.error = msg;
    }

    clearError() {
        this.setError('')
    }
}

class ScanningProgressStore {
    firstStart = true
    scanning = false
    progress = 0
    scanning_port = ""

    _requestScanning = false

    constructor() {
        makeObservable(this,{
            scanning: observable,
            progress: observable,
            scanning_port: observable,
            setStateFromMqtt: action,
            startScan: action,
            scanFailed: action.bound
        })
    }

    setStateFromMqtt(isScanning, scanProgress, scanningPort) {
        if (this.scanning) {
            this._requestScanning = false
        }
        this.scanning = this._requestScanning ? true : isScanning
        this.progress = scanProgress
        this.scanning_port = scanningPort
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
            
            const onDeviceManagerUnavailable = () => {
                scope.mqttStore.setDeviceManagerUnavailable()
                scope.globalError.setError(i18n.t('device-manager.errors.unavailable'))
            }

            const onScanFailed = (err) => {
                scope.scanStore.scanFailed()
                if ("MqttTimeoutError".localeCompare(err.data) == 0) {
                    onDeviceManagerUnavailable()
                } else {
                    scope.globalError.setError(err.message)
                }
            }

            const onStartScanning = () => {
                scope.scanStore.startScan()
                scope.devicesStore.setDevices([])
                scope.globalError.clearError()
                DeviceManagerProxy.Scan().catch(onScanFailed);
            }

            // Expected props structure
            // https://github.com/wirenboard/wb-device-manager/blob/main/README.md
            const updateStores = (dataToRender) => {
                // wb-device-manager could be stopped, so it will clear state topic and send empty string
                if (dataToRender == '') {
                    onDeviceManagerUnavailable()
                } else {
                    const data = JSON.parse(dataToRender)
                    if (data.error) {
                        scope.globalError.setError(data.error);
                    }
                    scope.scanStore.setStateFromMqtt(data.scanning, data.progress, data.scanning_port)
                    scope.devicesStore.setDevices(data.devices)
                    scope.mqttStore.setStartupComplete()
                }
            }

            const params = {
                mqtt: scope.mqttStore,
                scanning: scope.scanStore,
                devices: scope.devicesStore,
                errors: scope.globalError,
                onStartScanning: onStartScanning
            }
            scope.root.render(CreateDevicesPage(params));

            element.on('$destroy', function() {
                scope.root.unmount();
            });

            whenMqttReady()
                .then( () => DeviceManagerProxy.hasMethod('Scan') )
                .then((available) => {
                    if (available) {
                        scope.mqttStore.setDeviceManagerAvailable()
                        mqttClient.addStickySubscription('/wb-device-manager/state', function(msg) {
                            updateStores(msg.payload, scope.scanStore, scope.devicesStore, scope.mqttStore, scope.globalError)
                        })
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
