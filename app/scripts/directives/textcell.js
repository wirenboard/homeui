function textCellDirective() {
  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    replace: true,
    template: `
      <div>
        <p ng-if="cell.readOnly" class="cell cell-text" type="text">{{ cell.value }}</p>
        <input ng-hide="cell.readOnly" class="cell cell-text" type="text" ng-model="cell.value" explicit-changes>
      </div>
    `
  };
}

export default textCellDirective;
