"use strict";

angular.module("homeuiApp")
  .factory("getTime", function () {
    return function getTime () {
      return new Date().getTime();
    };
  });
