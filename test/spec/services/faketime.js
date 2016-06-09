"use strict";

angular.module('homeuiApp.fakeTime', ["homeuiApp"])
  .factory("FakeTime", () => {
    var d = null;
    return {
      getTime () {
        if (d === null)
          throw new Error("time not set");
        return d;
      },

      setTime (newTime) {
        if (!newTime || !newTime instanceof Date)
          throw new Error("invalid time");
        d = newTime;
      }
    };
  })
  .factory("getTime", FakeTime => FakeTime.getTime);
