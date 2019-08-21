'use strict';

import template from './channelSelectPattern.html';

export default function(uiConfig, DeviceData) {
    'ngInject';

    return {
        restrict: 'EA',
        scope: {},
        require: 'ngModel',
        replace: true,
        template,
        link: (scope, element, attrs, ngModelCtrl) => {

            var allCells = [];

            scope.anyDevice = {
                id: '+',
                name: '+'
            };
            scope.anyControl = {
                id: '+',
                name: '+'
            };

            scope.choice = {
                device: scope.anyDevice.id,
                control: scope.anyControl.id
            };

            scope.devices = [];
            scope.controls = [];

            scope.isLoaded = false;

            let getDevices = () => {
                let tmp = Object.values(allCells);

                if (scope.choice.control !== '+') {
                    tmp = tmp.filter(cell => cell.controlId === scope.choice.control);
                }

                tmp = tmp.map(cell => {
                    return {id: cell.deviceId, name: cell.deviceId };
                });

                let prop = 'id';
                let items = tmp.filter((e, i) => tmp.findIndex(a => a[prop] === e[prop]) === i).sort((a, b) => a.name.localeCompare(b.name));

                return [scope.anyDevice].concat(items);
            };

            let getControls = () => {
                let tmp = Object.values(allCells);

                if (scope.choice.device !== '+') {
                    tmp = tmp.filter(cell => cell.deviceId === scope.choice.device);
                }

                tmp = tmp.map(cell => {
                    return {id: cell.controlId, name: cell.controlId };
                });

                let prop = 'id';
                let items = tmp.filter((e, i) => tmp.findIndex(a => a[prop] === e[prop]) === i).sort((a, b) => a.name.localeCompare(b.name));
                
                return [scope.anyControl].concat(items);
            };

            let updateValue = () => {
                let value = scope.choice.device + '/' + scope.choice.control;
                ngModelCtrl.$setViewValue(value);
            };

            uiConfig.whenReady().then(() => {
                allCells = DeviceData.cells;

                scope.devices = getDevices();
                scope.controls = getControls();

                scope.isLoaded = true;
            });

            scope.clear = function() {
                scope.choice.device = '+';
                scope.choice.control = '+';
            };

            scope.$watch('choice.device', (newValue, oldValue) => {
                if (newValue !== oldValue) {
                    if (newValue !== '+') {
                        let cells = Object.values(allCells).filter(cell => cell.deviceId === newValue && cell.controlId === scope.choice.control);
                        if (!cells.length) {
                            scope.choice.control = '+';
                        }
                    }
                    scope.controls = getControls();

                    updateValue();
                }
            });

            scope.$watch('choice.control', (newValue, oldValue) => {
                if (newValue !== oldValue) {
                    if (newValue !== '+') {
                        let cells = Object.values(allCells).filter(cell => cell.deviceId === scope.choice.device && cell.controlId === newValue);
                        if (!cells.length) {
                            scope.choice.device = '+';
                        }
                    }
                    scope.devices = getDevices();

                    updateValue();
                }
            });

            ngModelCtrl.$render = (v) => {
                let val = ngModelCtrl.$viewValue;
                if (val) {
                    let tmp = val.split('/');
                    if (tmp.length === 2) {
                        scope.choice.device = tmp[0];
                        scope.choice.control = tmp[1];
                    }
                }
            };
        }
    };
}