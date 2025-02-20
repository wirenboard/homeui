function transformRgbDirective() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: (scope, element, attrs, ngModel) => {
      ngModel.$formatters.push(value => {
        value = value || { r: 0, g: 0, b: 0 };
        return 'rgb(' + [value.r, value.g, value.b].join(',') + ')';
      });
      ngModel.$parsers.push(value => {
        var m = value.match(/rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/);
        if (!m) return { r: 0, g: 0, b: 0 };
        return { r: m[1] - 0, g: m[2] - 0, b: m[3] - 0 };
      });
    },
  };
}

export default transformRgbDirective;
