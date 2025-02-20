import template from './cellpicker.html';

function cellPickerDirective(DeviceData, $locale) {
  'ngInject';

  const DEFAULT_PLACEHOLDER = 'Select a control or search for it...';

  return {
    restrict: 'EA',
    scope: {
      filterByType: '&',
      placeholder: '@',
    },
    require: 'ngModel',
    replace: true,
    template,
    link: (scope, element, attrs, ngModelCtrl) => {
      var items = {};

      function internCellItem(cellId) {
        if (!cellId) return null;

        var cell = DeviceData.proxy(cellId),
          devName = DeviceData.devices.hasOwnProperty(cell.deviceId)
            ? DeviceData.devices[cell.deviceId].getName($locale.id)
            : cell.deviceId,
          fullCellName = devName + ' / ' + cell.getName($locale.id);

        if (items.hasOwnProperty(cellId)) items[cellId].name = fullCellName;
        else items[cellId] = { id: cellId, name: fullCellName };

        return items[cellId];
      }

      scope.choice = {};

      scope.cells = () =>
        (scope.filterByType()
          ? DeviceData.getCellIdsByType(scope.filterByType())
          : DeviceData.getCellIds()
        ).map(internCellItem);

      scope.actualPlaceholder = () => {
        return scope.placeholder || DEFAULT_PLACEHOLDER;
      };

      scope.$watch('choice.selected', (newValue, oldValue) => {
        if (newValue !== oldValue) {
          ngModelCtrl.$setViewValue(newValue && newValue.id);
        }
      });

      ngModelCtrl.$render = v => {
        scope.choice.selected = internCellItem(ngModelCtrl.$viewValue);
      };
    },
  };
}

export default cellPickerDirective;
