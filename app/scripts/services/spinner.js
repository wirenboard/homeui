function spinnerService($rootScope) {
  'ngInject';

  var spinner = Object.create(null);

  function isActive (prefix) {
    for (var k in spinner) {
      if (prefix === undefined || k.replace(/\s+.*$/, "") == prefix)
        return true;
    }
    return false;
  }

  $rootScope.spinnerActive = isActive;

  function fullId (id, suffix) {
    return suffix === undefined ? id : id + " " + suffix;
  }

  return {
    start (id, suffix) {
      spinner[fullId(id, suffix)] = true;
    },
    stop (id, suffix) {
      delete spinner[fullId(id, suffix)];
    },
    isActive: isActive
  };
}

export default spinnerService;
