import template from './rangecell.html';

function rangeCellDirective() {
  const DEFAULT_MIN = 0, DEFAULT_MAX = 1e9, DEFAULT_STEP = 1;

  class RangeCellController {
    constructor (TranslationService) {
      this.TranslationService = TranslationService
    }

    getUnitsName(c) {
      return this.TranslationService.getUnitsName(c);
    }
  }

  return {
    restrict: "EA",
    scope: false,
    require: "^cell",
    replace: true,
    template,
    controllerAs: "rCtrl",
    controller: RangeCellController,
    link: ($scope, element, attr, cellCtrl) => {
      /*function relayAttr (name, defaultValue) {
        // Make sure min/max/precision are initialized to a range that is
        // broad enough for the range control to initialize correctly.
        // See https://github.com/angular/angular.js/issues/6726
        $scope.$watch(() => cellCtrl.cell[name], newValue => {
          element.find("input").attr(name, cellCtrl.cell[name] === null ? defaultValue : cellCtrl.cell[name]);
        });
      }*/


      /*relayAttr("min", DEFAULT_MIN);
      relayAttr("max", DEFAULT_MAX);
      relayAttr("step", DEFAULT_STEP);*/
      // Protect against non-number values that cause error inside Angular.
      // Can't just use ng-if on input as with value-cell because in this
      // case relayAttr hack will not work.
      /*$scope.target = {
        get value () {
          var v = $scope.cell.value - 0;
          return isNaN(v) ? 0 : v;
        },
        set value (newValue) {
          $scope.cell.value = newValue;
        }
      };*/

      $scope["min"] = !cellCtrl.cell["min"]? DEFAULT_MIN : +cellCtrl.cell["min"];
      $scope["max"] = !cellCtrl.cell["max"]? DEFAULT_MAX : +cellCtrl.cell["max"];
      $scope["step"] = !cellCtrl.cell["step"]? DEFAULT_STEP : +cellCtrl.cell["step"];

      $scope.$watch(() => $scope.cell.value, value => {
        $scope._value = isNaN(value)? 0 : value;
      });

      // из-за отсутствия debounce присваиваю значение только если отпуcтить ручку контрола
      $scope.handleUp = function() {
        $scope.cell.value = $scope._value;
      }
    }
  };
}

export default rangeCellDirective;
