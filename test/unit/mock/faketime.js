export default angular.module('homeuiApp.fakeTime', [])
  .factory("FakeTime", () => {
    var d = null;
    return {
      getTime() {
        if (d === null) {
          throw new Error("time not set");
        } else {
          return d;
        }
      },

      setTime(newTime) {
        if (!newTime || !newTime instanceof Date) {
          throw new Error("invalid time");
        } else {
          d = newTime;
        }
      }
    };
  })
  .factory("getTime", FakeTime => FakeTime.getTime)
  .name;
