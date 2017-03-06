import template from './switchcell.html';

function switchCellDirective() {
  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    replace: true,
    template
  };
}

export default switchCellDirective;
