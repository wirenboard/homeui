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
            placeholder: '@'
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
                var devName = allDevices.hasOwnProperty(cell.deviceId) ? allDevices[cell.deviceId].name : cell.deviceId;
                var fullCellName = cell.id + ' [' + devName + ']';

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

            scope.choice = {};
            scope.cells = [];
            scope.isLoaded = false;

            uiConfig.whenReady().then(() => {
                allDevices = DeviceData.devices;
                allCells = DeviceData.cells;
                scope.cells = filteredCells().map(internCellItem);
                scope.isLoaded = true;
            });

            scope.actualPlaceholder = () => {
                return scope.placeholder || DEFAULT_PLACEHOLDER;
            };

            scope.$watch('choice.selected', (newValue, oldValue) => {
                if (newValue !== oldValue) {
                    ngModelCtrl.$setViewValue(newValue && newValue.id);
                }
            });

            scope.$watch('filterByDevice()', (newValue, oldValue) => {
                if (newValue !== oldValue) {
                    scope.choice = {};
                    scope.cells = filteredCells().map(internCellItem);
                }
            });

            scope.$watch('filterByType()', (newValue, oldValue) => {
                if (newValue !== oldValue) {
                    scope.choice = {};
                    scope.cells = filteredCells().map(internCellItem);
                }
            });

            ngModelCtrl.$render = (v) => {
                scope.choice.selected = internCellItem(ngModelCtrl.$viewValue);
            };
        }
    };
}
