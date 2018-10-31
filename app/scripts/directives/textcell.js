import template from './textcell.html'

function textCellDirective() {
  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    replace: true,
    template: template
  };
}

export default textCellDirective;
