import template from './alarmcell.html';

function alarmCellDirective() {
  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    replace: true,
    template,
  };
}

export default alarmCellDirective;
