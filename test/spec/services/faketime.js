"use strict";

angular.module('homeuiApp.fakeTime', ["homeuiApp"])
  .factory("FakeTime", function () {
    var d = null;
    return {
      getTime: function () {
        if (d === null)
          throw new Error("time not set");
        return d;
      },

      setTime: function (newTime) {
        if (!newTime || !newTime instanceof Date)
          throw new Error("invalid time");
        d = newTime;
      }
    };
  })
  .factory("getTime", function (FakeTime) {
    return FakeTime.getTime;
  });
