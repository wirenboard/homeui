import template from './rangecell.html';

function rangeCellDirective() {
  const DEFAULT_MIN = 0,
    DEFAULT_MAX = 1e9,
    DEFAULT_STEP = 1;

  class RangeCellController {
    constructor(TranslationService) {
      'ngInject';

      this.TranslationService = TranslationService;
    }

    getUnitsName(c) {
      return this.TranslationService.getUnitsName(c);
    }
  }

  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    replace: true,
    template,
    controllerAs: 'rCtrl',
    controller: RangeCellController,
    link: ($scope, element, attr, cellCtrl) => {
      // Make sure min/max/precision are initialized to a range that is
      // broad enough for the range control to initialize correctly.
      // See https://github.com/angular/angular.js/issues/6726
      function watchAttr(name, defaultValue) {
        $scope.$watch(
          () => cellCtrl.cell[name],
          newValue => {
            $scope[name] = !newValue ? defaultValue : +newValue;
          }
        );
      }

      watchAttr('max', DEFAULT_MAX);
      watchAttr('min', DEFAULT_MIN);
      watchAttr('step', DEFAULT_STEP);

      const units = $scope.rCtrl.TranslationService.getUnitsName(cellCtrl.cell);
      element.get(0).querySelector('.ngrs-value-max .ng-binding')?.setAttribute('data-units', ` ${units}`)

      $scope.$watch(
        () => $scope.cell.value,
        value => {
          $scope._value = isNaN(value) ? 0 : value;
        }
      );

      // из-за отсутствия debounce присваиваю значение только если отпуcтить ручку контрола
      $scope.handleUp = function () {
        $scope.cell.value = $scope._value;
      };
    },
  };
}

export default rangeCellDirective;
