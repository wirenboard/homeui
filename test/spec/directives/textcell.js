"use strict";

describe("Directive: text-cell", () => {
  var f, DeviceData, container, scope, element;
  beforeEach(module("homeuiApp"));
  beforeEach(module("homeuiApp.mqttDirectiveFixture"));

  beforeEach(inject(function (MqttDirectiveFixture, _DeviceData_, $compile) {
    f = new MqttDirectiveFixture("<text-cell cell='dev1/foobar'></text-cell>");
    DeviceData = _DeviceData_;
    f.extClient.send("/devices/dev1/controls/foobar/meta/type", "text", true, 1);
    f.extClient.send("/devices/dev1/controls/foobar", "qqq", true, 0);
    f.$scope.$digest();
  }));

  it("should display the value of the cell in a text field", () => {
    var el = f.container.find("input.cell.cell-text");
    expect(el).toHaveLength(1);
    expect(el).toBeVisible();
    expect(el.val()).toBe("qqq");
    expect(el.prop("readonly")).toBe(true);
  });
});
