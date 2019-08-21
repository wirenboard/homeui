'use strict';

import template from './channelSelectPicker.html';

export default function(uiConfig, DeviceData) {
    'ngInject';

    const DEFAULT_PLACEHOLDER = 'Select a control or search for it...';

    return {
        restrict: 'EA',
        scope: {
            filterByType: '&',
            filterByDevice: '&',
            placeholder: '@',
            usePattern: '@'
        },
        require: 'ngModel',
        replace: true,
        template,
        link: (scope, element, attrs, ngModelCtrl) => {
            var items = {};

            var allDevices = [];
            var allCells = [];

            function internCellItem(cellId) {
                if (!cellId) {
                    return null;
                }

                var cell = DeviceData.proxy(cellId);
                var fullCellName = cell.id;

                if (items.hasOwnProperty(cellId)) {
                    items[cellId].name = fullCellName;
                }
                else {
                    items[cellId] = { 
                        id: cellId, 
                        name: fullCellName
                    };
                }

                return items[cellId];
            }

            function filteredCells() {
                let device = scope.filterByDevice();
                let type = scope.filterByType();
                let tmp = Object.values(allCells);

                if (device) {
                    tmp = tmp.filter(cell => cell.deviceId === device);
                }
                if (type) {
                    tmp = tmp.filter(cell => cell.type === type);
                }

                return tmp.map(c => c.id);
            }

            function listCells() {
                let cells = filteredCells().map(internCellItem);

                if (scope.usePattern === 'true') {
                    let devices = [];
                    let controls = [];

                    cells.forEach(cell => {
                        let tmp = cell.id.split('/');
                        if (tmp.length === 2) {
                            devices.push(tmp[0]);
                            controls.push(tmp[1]);
                        }
                    });

                    devices = [...new Set(devices)];
                    controls = [...new Set(controls)];

                    cells.push({
                        id: '+/+',
                        name: '+/+'
                    });

                    devices.forEach(device => {
                        cells.push({
                            id: device + '/+',
                            name: device + '/+'
                        });
                    });

                    controls.forEach(control => {
                        cells.push({
                            id: '+/' + control,
                            name: '+/' + control
                        });
                    });
                }

                let prop = 'id';
                cells = cells.filter((e, i) => cells.findIndex(a => a[prop] === e[prop]) === i).sort((a, b) => a.name.localeCompare(b.name));

                return cells;
            }

            scope.choice = {};
            scope.cells = [];
            scope.isLoaded = false;

            uiConfig.whenReady().then(() => {
                allDevices = DeviceData.devices;
                allCells = DeviceData.cells;
                scope.cells = listCells();
                scope.isLoaded = true;
            });

            scope.actualPlaceholder = () => {
                return scope.placeholder || DEFAULT_PLACEHOLDER;
            };

            scope.addNew = function(newVal) {
                return {id: newVal, name: newVal};
            };

            scope.$watch('choice.selected', (newValue, oldValue) => {
                if (newValue !== oldValue) {
                    ngModelCtrl.$setViewValue(newValue && newValue.id);
                }
            });

            scope.$watch('filterByDevice()', (newValue, oldValue) => {
                if (newValue !== oldValue) {
                    scope.choice = {};
                    scope.cells = listCells();
                }
            });

            scope.$watch('filterByType()', (newValue, oldValue) => {
                if (newValue !== oldValue) {
                    scope.choice = {};
                    scope.cells = listCells();
                }
            });

            ngModelCtrl.$render = (v) => {
                scope.choice.selected = internCellItem(ngModelCtrl.$viewValue);
            };
        }
    };
}
