"use strict";

angular.module("homeuiApp")
  .directive("widget", function (DeviceData) {
    function cellName (id) {
      try {
        return DeviceData.proxy(id).name;
      } catch (e) {
        console.error("bad cell id: " + id);
        return id;
      }
    }

    var cellTypeNames = ["any"].concat(DeviceData.cellTypeNames());

    class WidgetController {
      constructor ($scope, $element, $attrs) {
        this.cellType = "any";
        this.source = {};
        this.originalSource = {};
        $scope.$watch(() => this._source(), newSource => {
          if (!$scope.widgetForm.$visible)
            this.updateSource();
        }, true);
        // add cell upon picker selection
        $scope.$watch(() => this.newCellId, newCellId => {
          if (!newCellId || this.source.cells.find(cell => cell.id === newCellId))
            return;
          this.source.cells.push({ id: newCellId, name: cellName(newCellId) });
          this.newCellId = null;
        });
      }

      updateSource () {
        var newSource = this._source();
        this.source = newSource ? angular.copy(newSource) :
          {
            name: "",
            compact: true,
            cells: []
          };
      }

      get cellTypeNames () {
        return cellTypeNames;
      }

      cellTypeFromId (id) {
        try {
          return DeviceData.proxy(id).type;
        } catch (e) {
          console.error("bad cell id: " + id);
          return "<error>";
        }
      }

      cellTypeFilter () {
        return this.cellType == "any" ? "" : this.cellType;
      }

      prepareToEdit () {
        this.source.cells.forEach(cell => {
          if (!cell.hasOwnProperty("name") || !cell.name)
            cell.name = cellName(cell.id);
        });
      }

      commit () {
        if (this._source()) {
          // clear cell names that are the same as original
          this.source.cells.forEach(cell => {
            var oldName = cellName(cell.id),
                newName = (cell.name || "").replace(/^s+|\s+$/g, "");
            if (!newName || oldName == newName)
              delete cell.name;
          });
          angular.extend(this._source(), this.source);
        }
      }

      cancel () {
        this.updateSource();
      }

      checkNonEmpty (value, msg) {
        if (!/\S/.test(value))
          return msg;
        return true;
      }

      deleteCell (cell) {
        var index = this.source.cells.indexOf(cell);
        if (index >= 0)
          this.source.cells.splice(index, 1);
      }

      verify () {
        if (!this.source.cells.length)
          return "error";
        return true;
      }
    }

    return {
      restrict: "EA",
      scope: {},
      bindToController: {
        _source: "&source",
        onDelete: "&"
      },
      controllerAs: "ctrl",
      controller: WidgetController,
      replace: true,
      templateUrl: "scripts/directives/widget.html"
    };
  });
