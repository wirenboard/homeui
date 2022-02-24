import template from './valuecell.html';

function valueCellDirective() {

  class ValueCellController {
    constructor (TranslationService) {
      'ngInject';

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
    controllerAs: "vCtrl",
    controller: ValueCellController
  };
}

export default valueCellDirective;
