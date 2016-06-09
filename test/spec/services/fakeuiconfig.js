"use strict";

angular.module("homeuiApp.fakeUIConfig", ["homeuiApp"])
  .factory("uiConfig", ()  => {
    return {
      data: {
        rooms: []
      }
    };
  });
