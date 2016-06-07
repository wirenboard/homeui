"use strict";

describe("Directive: alarm-cell", () => {
  var f, DeviceData;
  beforeEach(module("homeuiApp"));
  beforeEach(module("homeuiApp.mqttDirectiveFixture"));

  beforeEach(inject((MqttDirectiveFixture, _DeviceData_, $compile) => {
    f = new MqttDirectiveFixture("<alarm-cell cell='dev2/fooAlarm'></alarm-cell>");
    DeviceData = _DeviceData_;
    f.extClient.send("/devices/dev2/controls/fooAlarm/meta/type", "alarm", true, 1);
    f.extClient.send("/devices/dev2/controls/fooAlarm/meta/name", "Sample Alarm", true, 1);
    f.extClient.send("/devices/dev2/controls/fooAlarm", "0", true, 0);
    f.$scope.$digest();
  }));

  afterEach(() => { f.remove(); });

  function alarmControl () {
    return f.container.find(".cell.cell-alarm:visible");
  }

  it("should display cell name", () => {
    expect(alarmControl()).toHaveText("Sample Alarm");
  });

  it("should reflect alarm state", () => {
    expect(alarmControl()).toExist();
    expect(alarmControl()).not.toHaveClass("alarm-active");
    f.extClient.send("/devices/dev2/controls/fooAlarm", "1", true, 0);
    f.$scope.$digest();
    expect(alarmControl()).toHaveClass("alarm-active");
  });
});
