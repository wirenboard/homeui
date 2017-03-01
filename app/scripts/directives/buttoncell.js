function buttonCellDirective() {
  'ngInject';

  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    replace: true,
    template: '<button type="button" ng-click="cell.value = true" ' +
      'ng-disabled="cell.readOnly" class="btn btn-primary cell cell-button">{{ cell.name }}</button>'
  };
}

export default buttonCellDirective;
