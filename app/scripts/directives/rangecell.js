function rangeCellDirective() {
  'ngInject';

  const DEFAULT_MIN = 0, DEFAULT_MAX = 1e9, DEFAULT_STEP = 1;
  return {
    restrict: "EA",
    scope: false,
    require: "^cell",
    replace: true,
    templateUrl: "scripts/directives/rangecell.html",
    link: ($scope, element, attr, cellCtrl) => {
      // Make sure min/max/step are initialized to a range that is
      // broad enough for the range control to initialize correctly.
      // See https://github.com/angular/angular.js/issues/6726
      function relayAttr (name, defaultValue) {
        $scope.$watch(() => cellCtrl.cell[name], newValue => {
          element.find("input").attr(name, cellCtrl.cell[name] === null ? defaultValue : cellCtrl.cell[name]);
        });
      }
      relayAttr("min", DEFAULT_MIN);
      relayAttr("max", DEFAULT_MAX);
      relayAttr("step", DEFAULT_STEP);
      // Protect against non-number values that cause error inside Angular.
      // Can't just use ng-if on input as with value-cell because in this
      // case relayAttr hack will not work.
      $scope.target = {
        get value () {
          var v = $scope.cell.value - 0;
          return isNaN(v) ? 0 : v;
        },
        set value (newValue) {
          $scope.cell.value = newValue;
        }
      };
    }
  };
}

export default rangeCellDirective;
