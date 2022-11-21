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

    getIntegerValue(c){
      if (("value" in c) && (c.value !== null))
        return c.value.toString().split('.')[0];
      return "";
    }

    getFractionalValue(c){
      if (("value" in c) && (c.value !== null)){
        if (("step" in c) && (c.step !== null)){
          var digits = c.step.toString().split('.')[1].length;
          return ("." + c.value.toFixed(digits).split('.')[1]);
        } else {
          var fraction = c.value.toString().split('.')[1];
          if (fraction !== undefined){
            return ("." + fraction);
          }
        }
      }
      return "";
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
