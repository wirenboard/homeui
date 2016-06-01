"use strict";

describe("Directive: value-cell", () => {
  var f, DeviceData, container, scope, element;
  beforeEach(module("homeuiApp"));
  beforeEach(module("homeuiApp.mqttDirectiveFixture"));

  beforeEach(inject(function (MqttDirectiveFixture, _DeviceData_, $compile) {
    f = new MqttDirectiveFixture("<value-cell cell='dev1/voltage1'></value-cell>");
    DeviceData = _DeviceData_;
    f.extClient.send("/devices/dev1/controls/voltage1/meta/type", "voltage", true, 1);
    f.extClient.send("/devices/dev1/controls/voltage1", "223", true, 0);
    f.$scope.$digest();
  }));

  it("should display the value of the cell together with its units", () => {
    var el = f.container.find(".cell.cell-value");
    expect(el).toHaveLength(1);
    expect(el).toBeVisible();
    expect(el).toContainText("223 V");
  });

  // TBD: editable value, via input[type=number] perhaps
});
