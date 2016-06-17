"use strict";

angular.module("homeuiApp")
  .provider("displayCellConfig", function () {
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
  })
  .directive("displayCell", (displayCellConfig, $compile) => {
    class DisplayCellController {
      constructor ($scope, $element, $attrs) {
        this.cell = $scope.cell;
      }

      shouldDisplayCellName () {
        return !this.compact() &&
          !(displayCellConfig.displayTypes.hasOwnProperty(this.cell.displayType) &&
            displayCellConfig.displayTypes[this.cell.displayType].noSeparateName);
      }
    }

    return {
      restrict: "EA",
      require: "^cell",
      scope: false,
      replace: true,
      bindToController: {
        compact: "&",
        overrideName: "&"
      },
      controller: DisplayCellController,
      // XXX: note that the property usually appears on the scope
      // created by 'cell' directive, so don't use two <display-cell>
      // directives within single 'cell' directive scope
      controllerAs: "displayCellCtrl",
      templateUrl: "scripts/directives/displaycell.html",
      link: (scope, element, attrs) => {
        scope.$watch(() => scope.cell.displayType, displayType => {
          var directive = (displayCellConfig.displayTypes.hasOwnProperty(displayType) ?
                           displayCellConfig.displayTypes[displayType] :
                           displayCellConfig.displayTypes["text"]).directive;
          element.find("> *:not(h4)").remove();
          $compile("<" + directive + "></" + directive + ">")(scope, (clonedElement) => {
            element.append(clonedElement);
          });
        });
      }
    };
  });
