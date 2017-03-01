function valueCellDirective() {
  'ngInject';

  return {
    restrict: "EA",
    scope: false,
    require: "^cell",
    replace: true,
    templateUrl: "scripts/directives/valuecell.html"
  };
}

export default valueCellDirective;
