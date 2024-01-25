import template from './displaycell.html';

function displayCellDirective(displayCellConfig, $compile) {
  'ngInject';

  class DisplayCellController {
    constructor($scope, $state, $element, $attrs, handleData, historyUrlService) {
      'ngInject';
      this.$scope = $scope;
      this.cell = $scope.cell;
      this.cell.copy = this.copy.bind(this);
      this.$state = $state;
      //console.log("+++++++++this.cell",this.cell);

      this.handleData = handleData;
      this.historyUrlService = historyUrlService;
    }

    /*copy() {
      console.log("this.parentName && this.cell.id",this.$scope.parentName , this.$scope.cell.id);

      if(this.parentName && this.cell.id) this.handleData.copyToClipboard(this.$scope.parentName + '/' + this.$scope.cell.id)
    }*/

    copy(value, allowCopy) {
      if (allowCopy) {
        var textValue = String(value);
        const MAX_TOOLTIP_VALUE_LENGTH = 20;
        if (textValue.length > MAX_TOOLTIP_VALUE_LENGTH) {
          textValue = textValue.substr(0, MAX_TOOLTIP_VALUE_LENGTH) + '...';
        }
        this.$scope.copyText = textValue;
        this.handleData.copyToClipboard(value);
      }
    }

    shouldDisplayCellName() {
      return (
        !this.compact() &&
        !(
          displayCellConfig.displayTypes.hasOwnProperty(this.cell.displayType) &&
          displayCellConfig.displayTypes[this.cell.displayType].noSeparateName
        )
      );
    }

    redirect(contr) {
      var [device, control] = contr.split('/');
      this.$state.go('history.sample', {
        data: this.historyUrlService.encodeControl(device, control),
      });
    }
  }

  return {
    restrict: 'EA',
    require: '^cell',
    scope: false, // нельзя изолировать
    replace: true,
    bindToController: {
      compact: '&',
      overrideName: '&',
    },
    controller: DisplayCellController,
    // XXX: note that the property usually appears on the scope
    // created by 'cell' directive, so don't use two <display-cell>
    // directives within single 'cell' directive scope
    controllerAs: 'displayCellCtrl',
    template,
    link: (scope, element, attrs) => {
      scope.$watch(
        () => scope.cell.displayType,
        displayType => {
          var directive = (
            displayCellConfig.displayTypes.hasOwnProperty(displayType)
              ? displayCellConfig.displayTypes[displayType]
              : displayCellConfig.displayTypes['text']
          ).directive;

          $compile('<' + directive + '></' + directive + '>')(scope, clonedElement => {
            let element_wrapper = element[0].querySelector('.display-cell-content');
            if (displayType == 'text') {
              element_wrapper.style.overflowX = 'auto';
            } else {
              element_wrapper.style.overflowX = null;
            }
            angular.element(element_wrapper.children[0]).replaceWith(clonedElement);
          });
        }
      );
    },
  };
}

//-----------------------------------------------------------------------------
function displayCellConfig() {
  'ngInject';
  angular.extend(this, {
    displayTypes: {},
    addDisplayType(displayType, directive, noSeparateName) {
      this.displayTypes[displayType] = {
        directive: directive,
        noSeparateName: noSeparateName || false,
      };
    },
    $get() {
      return this;
    },
  });
}

//-----------------------------------------------------------------------------
export { displayCellDirective, displayCellConfig };
