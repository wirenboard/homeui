'use strict';

import template from './deviceSelectPicker.html';

export default function(DeviceData) {
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

            function internCellItem(cellId) {
                if (!cellId) {
                    return null;
                }

                var cell = DeviceData.proxy(cellId);
                
                var devName = DeviceData.devices.hasOwnProperty(cell.deviceId) ? DeviceData.devices[cell.deviceId].name : cell.deviceId;
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
                let tmp = Object.values(DeviceData.cells);

                if (device) {
                    tmp = tmp.filter(cell => cell.deviceId === device);
                }
                if (type) {
                    tmp = tmp.filter(cell => cell.type === type);
                }
                
                return tmp.map(c => c.id);
            }

            scope.choice = {};

            scope.cells = () => (filteredCells()).map(internCellItem);

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
                }
            });

            scope.$watch('filterByType()', (newValue, oldValue) => {
                if (newValue !== oldValue) {
                    scope.choice = {};
                }
            });

            ngModelCtrl.$render = (v) => {
                scope.choice.selected = internCellItem(ngModelCtrl.$viewValue);
            };
        }
    };
}
