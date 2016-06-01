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

  function input () {
    var el = f.container.find("input.cell.cell-text");
    expect(el).toHaveLength(1);
    expect(el).toBeVisible();
    return el;
  }

  it("should display the value of the cell in a text field", () => {
    expect(input().val()).toBe("qqq");
    expect(input().prop("readonly")).toBe(false);
  });

  it("should display readonly cell values in readonly text field", () => {
    f.extClient.send("/devices/dev1/controls/foobar/meta/readonly", "1", true, 1);
    f.$scope.$digest();
    expect(input().val()).toBe("qqq");
    expect(input().prop("readonly")).toBe(true);
  });

  it("should allow value editing for non-readonly cells sending the value upon blur or Enter key press", () => {
    input().val("zzz").blur();
    f.expectJournal().toEqual([
      "ext: /devices/dev1/controls/foobar/on: [zzz] (QoS 1)"
    ]);
    input().val("abc").simulate("keydown", { keyCode: 13 });
    f.expectJournal().toEqual([
      "ext: /devices/dev1/controls/foobar/on: [abc] (QoS 1)"
    ]);
  });

  it("should discard unsent text field changes upon ESC key press", () => {
    input().val("zzz").simulate("keydown", { keyCode: 27 });
    expect(input().val()).toBe("qqq");
  });
});
