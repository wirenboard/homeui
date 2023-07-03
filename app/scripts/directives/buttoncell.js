import template from './buttoncell.html';

function buttonCellDirective(DeviceData) {
  'ngInject';

  class buttonCellController {
    getCellName(id) {
      try {
        console.log(DeviceData.cell(id));
        return DeviceData.cell(id);
      } catch (e) {
        console.error('bad cell id: ' + id);
        return id;
      }
    }
  }

  return {
    restrict: 'EA',
    scope: false,
    require: '^cell',
    controllerAs: 'ctrl',
    controller: buttonCellController,
    replace: true,
    template,
  };
}

export default buttonCellDirective;
