export default function onResizeDirective($parse) {
  return {
    link: postLink,
  };
  function postLink(scope, element, attrs) {
    scope.$watch(
      function () {
        return {
          h: element[0].offsetHeight,
          w: element[0].offsetWidth,
        };
      },
      function (newValue) {
        var rs = $parse(attrs.onResize);
        rs(scope, { size: newValue });
      },
      true
    );
  }
}
