function textCellDirective() {
  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    replace: true,
    template: '<input ng-readonly="cell.readOnly" class="cell cell-text" type="text" ng-model="cell.value" explicit-changes>'
  };
}

export default textCellDirective;
