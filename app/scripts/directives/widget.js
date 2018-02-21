import template from './widget.html';

function widgetDirective(DeviceData, rolesFactory) {
  'ngInject';

//-----------------------------------------------------------------------------
  function cellName (id) {
    try {
      return DeviceData.proxy(id).name;
    } catch (e) {
      console.error("bad cell id: " + id);
      return id;
    }
  }

//-----------------------------------------------------------------------------
  class WidgetController {
    constructor ($scope, $element, $attrs) {
      'ngInject';
      this.roles = rolesFactory;
      this.cellType = "any";
      this.source = {};
      this.jsonSource = angular.toJson(this.source, true);
      this.originalSource = {};
      this.editJsonMode = false;
      $scope.$watch(() => this._source(), newSource => {
        if (!$scope.widgetForm.$visible)
          this.updateSource();
      }, true);
      // add cell upon picker selection
      $scope.$watch(() => this.newCellId, newCellId => {
        if (!newCellId || this.source.cells.find(cell => cell.id === newCellId)) {
          this.newCellId = null;
          return;
        }
        this.source.cells.push({ id: newCellId, name: cellName(newCellId), extra: {}, type: DeviceData.proxy(newCellId).type});
        this.newCellId = null;
        // XXX the following is a hack, but we can't just set the name
        // in scope because we're using xeditable
        $scope.$evalAsync(() => {
          var el = $element.find(".panel-heading input[type=text]");
          if (el.length && !el.val())
            el.val(cellName(newCellId)).change();
        });
      });
      $scope.$watch(() => this.source.isNew && !$scope.widgetForm.$visible, shouldEdit => {
        if (shouldEdit)
          $scope.widgetForm.$show();
      });
      $scope.$watch(() => this.editJsonMode, (isJsonMode) => {
        const el = $element.find(".panel-heading input[type=text]");
        el.attr('disabled', isJsonMode);
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

    enableEditJsonMode () {
        this.jsonSource = angular.toJson(this.source, true);
        this.editJsonMode = true;
    }

    disableEditJsonMode () {
      this.editJsonMode = false;
    }

    updateSourceFromJson (needSave = false) {
      let newSource = null;
      try {
        newSource = angular.fromJson(this.jsonSource);
      } catch (e) {
        alert(e);
        return;
      }
      if (!newSource) { return; }
      if (needSave) {
        angular.extend(this._source(), newSource);
        this.updateSource();
      } else {
        this.source = newSource;
      }
      this.disableEditJsonMode();
    }

    get cellTypesUsed () {
      return ["any"].concat(DeviceData.cellTypesUsed());
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
        delete this._source().isNew;
      }
    }

    cancel () {
      if (this._source() && this._source().isNew)
        this.onDelete(this._source());
      else
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

//-----------------------------------------------------------------------------
  return {
    restrict: "EA",
    scope: {},
    bindToController: {
      _source: "&source",
      canRemove: "&",
      onRemove: "&",
      canDelete: "&",
      onDelete: "&"
    },
    controllerAs: "ctrl",
    controller: WidgetController,
    replace: true,
    template
  };
}

export default widgetDirective;
