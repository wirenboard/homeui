function cellNameDirective($locale) {
  'ngInject';

  return {
    restrict: 'EA',
    scope: {
      override: '&',
      displayId: '&',
    },
    require: '^cell',
    replace: true,
    // XXX: trying to use templateUrl causes 'controller cell not
    // found' error
    template:
      '<h4 class="cell-title">' +
      '<span class="name">{{ name() }}</span>' +
      '<span ng-if="displayId()" class="id" title="device/control id">{{ cellId() }}</span>' +
      '</h4>',

    link: (scope, element, attrs, cellCtrl) => {
      scope.cellId = () => cellCtrl.cell.id;
      scope.name = () => scope.override() || cellCtrl.cell.getName($locale.id);
    },
  };
}

export default cellNameDirective;
