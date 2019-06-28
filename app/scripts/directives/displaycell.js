import template from './displaycell.html';

function displayCellDirective(displayCellConfig, $compile) {
  'ngInject';

  class DisplayCellController {
    constructor ($scope, $state, $element, $attrs, handleData) {
      'ngInject';
      //this.$scope = $scope;
      this.cell = $scope.cell;
      this.cell.copy = this.copy.bind(this);
      this.$state = $state;
      //console.log("+++++++++this.cell",this.cell);

      this.handleData = handleData;
    }

    /*copy() {
      console.log("this.parentName && this.cell.id",this.$scope.parentName , this.$scope.cell.id);

      if(this.parentName && this.cell.id) this.handleData.copyToClipboard(this.$scope.parentName + '/' + this.$scope.cell.id)
    }*/

    copy(value) {
      if (this.cell.readOnly) {
        this.handleData.copyToClipboard(value)
      }
    }

    shouldDisplayCellName () {
      return !this.compact() &&
        !(displayCellConfig.displayTypes.hasOwnProperty(this.cell.displayType) &&
          displayCellConfig.displayTypes[this.cell.displayType].noSeparateName);
    }

    redirect(contr) {
      var [device,control] = contr.split('/');
      this.$state.go('history.sample', {device, control, start: '-', end: '-'})
    }
  }

  return {
    restrict: 'EA',
    require: '^cell',
    scope: false,// нельзя изолировать
    replace: true,
    bindToController: {
      compact: '&',
      overrideName: '&'
    },
    controller: DisplayCellController,
    // XXX: note that the property usually appears on the scope
    // created by 'cell' directive, so don't use two <display-cell>
    // directives within single 'cell' directive scope
    controllerAs: 'displayCellCtrl',
    template,
    link: (scope, element, attrs) => {

      scope.$watch(() => scope.cell.displayType, displayType => {
        var directive = (displayCellConfig.displayTypes.hasOwnProperty(displayType) ?
                         displayCellConfig.displayTypes[displayType] :
                         displayCellConfig.displayTypes['text']).directive;

        $compile('<' + directive + '></' + directive + '>')(scope, (clonedElement) => {
          angular.element(element[0].firstElementChild).after(clonedElement);
        });
      });
    }
  };
}

//-----------------------------------------------------------------------------
function displayCellConfig() {
  'ngInject';
  angular.extend(this, {
    displayTypes: {},
    addDisplayType (displayType, directive, noSeparateName) {
      this.displayTypes[displayType] = {
        directive: directive,
        noSeparateName: noSeparateName || false
      };
    },
    $get () {
      return this;
    }
  });
}

//-----------------------------------------------------------------------------
export {displayCellDirective, displayCellConfig};
