import template from './dashboardpicker.html';

function dashboardPickerDirective(uiConfig, $timeout) {
  'ngInject';

  return {
    restrict: 'EA',
    scope: {
      items: '=',
      buttonText: '@',
      onSelect: '='
    },
    replace: true,
    template,
    link: (scope, element) => {
      $timeout(() => {
        actionsWithUiSelectCtrl();
      }, 100);

      function actionsWithUiSelectCtrl () {
        const uiSelect = element.find(".ui-select-container").controller('uiSelect');
        scope.showSelect = () => {
          scope.active = true;
          $timeout(() => {
            uiSelect.activate();
          }, 100)
        };
      }

      scope.onToogleSelect = (isOpen) => {
        if (!isOpen) {
          scope.active = false;
          if (!angular.equals({}, scope.choice.selected)) {
            scope.onSelect(scope.choice.selected);
            scope.choice.selected = {};
          }
        }
      };

      scope.choice = {};
      scope.choice.selected = {};
      scope.active = false;
    }
  };
}

export default dashboardPickerDirective;
