function cellDirective(DeviceData, $parse) {
  'ngInject';
  
  class CellController {
    constructor ($scope, $element, $attrs) {
      'ngInject';
      // XXX should be possible to change the cell
      this.cell = $scope.cell = DeviceData.proxy($scope.$eval($attrs.cell));
    }
  }

  return {
    restrict: "A",
    scope: true,
    priority: 1, // take precedence over ng-model
    controller: CellController
  };
}

export default cellDirective;
