function explicitChangesDirective() {
  'ngInject';

  return {
    restrict: 'A',
    require: 'ngModel',
    link: (scope, element, attr, ngModelCtrl) => {
      if (attr.type === 'radio' || attr.type === 'checkbox')
        return;

      function sendValue () {
        scope.$apply(() => {
          ngModelCtrl.$setViewValue(element.val());
          ngModelCtrl.$setPristine();
        });
      }

      element.off('input').off('keydown').off('change');
      element.on('blur', sendValue);
      element.on('keydown', e => {
        if (e.keyCode == 13)
          sendValue();
        else if (e.keyCode == 27)
          element.val(ngModelCtrl.$viewValue);
      });
    }
  };
}

export default explicitChangesDirective;
