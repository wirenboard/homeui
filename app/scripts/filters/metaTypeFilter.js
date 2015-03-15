'use strict';

angular.module('homeuiApp.dataFilters', [])
  .filter('metaTypeFilter', function () {
    return function (items, search) {
      var result = [];
      angular.forEach(items, function (value, key) {
        if (value['metaType'] === search) {
          result.push(value);
        };
      });
      return result;
    };
  });