"use strict";

angular.module("homeuiApp")
  .factory("getTime", () => {
    return () => new Date().getTime();
  });
