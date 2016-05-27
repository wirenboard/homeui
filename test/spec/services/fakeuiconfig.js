"use strict";

angular.module("homeuiApp.fakeUIConfig", ["homeuiApp"])
  .factory("uiConfig", function () {
    return {
      data: {
        rooms: []
      }
    };
  });
