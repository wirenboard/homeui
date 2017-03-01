function switchCellDirective() {
  'ngInject';

  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    replace: true,
    templateUrl: 'scripts/directives/switchcell.html'
  };
}

export default switchCellDirective;
