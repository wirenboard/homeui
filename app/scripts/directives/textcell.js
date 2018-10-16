function textCellDirective() {
  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    replace: true,
    template: `
      <div>
        <span ng-if="cell.readOnly" class="cell cell-value cell-text">
          <span class="value">
            {{ cell.value }}
          </span>
          <span class="units"></span>
        </span>
        <input ng-hide="cell.readOnly" class="cell cell-text" type="text" ng-model="cell.value" explicit-changes>
      </div>
    `
  };
}

export default textCellDirective;
