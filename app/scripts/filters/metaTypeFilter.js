import angular from 'angular';

//-----------------------------------------------------------------------------
const metaTypeFilterModule = angular
  .module('homeuiApp.dataFilters', [])
  .filter('metaTypeFilter', metaTypeFilter)
  .name;

//-----------------------------------------------------------------------------
function metaTypeFilter() {
  return function (items, search) {
    var result = [];
    angular.forEach(items, function (value, key) {
      if (value['metaType'] === search) {
        result.push(value);
      }else if(search === undefined){
        result.push(value);
      };
    });
    return result;
  };
}

//-----------------------------------------------------------------------------
export default metaTypeFilterModule;
