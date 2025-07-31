'use strict';

// Service used to keep track of templates data
function templatesConfigService($q) {
  'ngInject';

  var data = {
    templates: []
  };

  var deferReady = $q.defer();

  return {
    data,

    whenReady() {
      return deferReady.promise;
    },

    ready(changes) {
      if (changes) {
        angular.extend(data, changes);
      }
      deferReady.resolve(data);
    }
  }
}

export default templatesConfigService;
