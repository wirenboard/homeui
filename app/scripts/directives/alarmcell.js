function alarmCellDirective() {
  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    replace: true,
    template: '<h4 class="cell cell-alarm alarm" ng-class=\"{ "alarm-active": cell.value }\">{{ cell.name }}</h4>'
  };
}

export default alarmCellDirective;
