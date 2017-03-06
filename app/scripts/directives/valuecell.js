import template from './valuecell.html';

function valueCellDirective() {
  return {
    restrict: "EA",
    scope: false,
    require: "^cell",
    replace: true,
    template
  };
}

export default valueCellDirective;
