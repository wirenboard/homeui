'use strict';

// Service to keep track of events data
//
// Why not uiconfig:
// Events might be overloading uiconfig due to increased saving frequency
// So new file (/etc/wb-events.conf) is manipulated to write/read events data
// Therefore (possibly) enormous svgs' data don't write to the file frequently
// Causing the app.errors.overflow to fire
function eventsConfigService($q) {
  'ngInject';

  var data = {
    events: [],
    triggeredEvents: [],
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

export default eventsConfigService;
