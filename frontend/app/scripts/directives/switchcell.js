'use strict';

import template from './switchcell.html';

function switchCellDirective() {
  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    replace: true,
    template,

    link: (scope, element, attrs, cellCtrl) => {
      scope.$watch(
        () => scope._value,
        (newValue, oldValue) => {
          if (newValue !== oldValue) {
            const valueToSet = scope.cell.extra.invert ? !scope._value : scope._value;
            if (scope.cell.value != valueToSet) {
              scope.cell.value = valueToSet;
            }
          }
        }
      );
      scope.$watch(
        () => scope.cell.value,
        (newValue, oldValue) => {
          if (newValue !== oldValue) {
            scope._value = scope.cell.extra.invert ? !scope.cell.value : scope.cell.value;
          }
        }
      );
      scope._value = scope.cell.extra.invert ? !scope.cell.value : scope.cell.value;
    },
  };
}

export default switchCellDirective;
