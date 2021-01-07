import template from './rgbcell.html';

function rgbCellDirective(rgbLocalStorageKey) {
  'ngInject';
  
  class RgbController {
    constructor ($scope, $element, $attrs) {
      'ngInject';
      this.cell = $scope.cell;
      this.colorPickerOptions = {
        showPalette: true,
        showButtons: false
      };
      if (rgbLocalStorageKey)
        this.colorPickerOptions.localStorageKey = rgbLocalStorageKey;
    }

    indicatorStyle () {
      var c = this.cell.value;
      if (!angular.isObject(c))
        return {};
      return {
        'background-color': 'rgb(' + [c.r, c.g, c.b].join(',') + ')'
      };
    }
  }

  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    replace: true,
    controllerAs: 'rgbCtrl',
    template,
    controller: RgbController,
    link: (scope, element, attr) => {
      // 'show' event causes widgets' onshow attribute value used by
      // xeditable to be executed as plain js
      element.on('show.spectrum', event => event.stopPropagation());
    }
  };
}

export default rgbCellDirective;
