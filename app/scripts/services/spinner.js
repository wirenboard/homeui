"use strict";

angular.module("homeuiApp")
  .factory("Spinner", function ($rootScope) {
    var spinner = Object.create(null);

    function isActive (prefix) {
      for (var k in spinner) {
        if (prefix === undefined || k.replace(/\s+.*$/, "") == prefix) {
          return true;
        }
      }
      return false;
    }

    $rootScope.spinnerActive = isActive;

    function fullId (id, suffix) {
      return suffix === undefined ? id : id + " " + suffix;
    }

    return {
      start: function (id, suffix) {
        spinner[fullId(id, suffix)] = true;
      },
      stop: function (id, suffix) {
        delete spinner[fullId(id, suffix)];
      },
      isActive: isActive
    };
  });
