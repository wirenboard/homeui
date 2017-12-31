import template from './switchcell.html';

function switchCellDirective() {
  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    replace: true,
    template,

    link: (scope, element, attrs, cellCtrl) => {
      scope._value = scope.cell.extra.invert ? !scope.cell.value : scope.cell.value;
      scope.name = () => scope.override() || cellCtrl.cell.name;
    }
  };
}

export default switchCellDirective;
