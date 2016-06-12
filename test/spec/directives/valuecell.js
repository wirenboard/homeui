"use strict";

describe("Directive: value-cell", () => {
  var f;
  beforeEach(module("homeuiApp.mqttDirectiveFixture"));

  beforeEach(inject((MqttDirectiveFixture) => {
    f = new MqttDirectiveFixture("<value-cell cell=\"'dev1/voltage1'\"></value-cell>");
    f.extClient.send("/devices/dev1/controls/voltage1/meta/type", "wvalue", true, 1);
    f.extClient.send("/devices/dev1/controls/voltage1/meta/units", "V", true, 1);
    f.extClient.send("/devices/dev1/controls/voltage1", "223", true, 0);
    f.$scope.$digest();
  }));

  afterEach(() => { f.remove(); });

  function input () {
    return f.container.find(".cell.cell-value input[type=number]:visible");
  }

  it("should display the value of the cell together with its units", () => {
    var el = f.container.find(".cell.cell-value");
    expect(el).toHaveLength(1);
    expect(el).toBeVisible();
    expect(input()).toHaveValue("223");
    expect(el.find(".units:visible")).toHaveText("V");
  });

  it("should display readonly cell values in a span field", () => {
    f.extClient.send("/devices/dev1/controls/voltage1/meta/readonly", "1", true, 1);
    f.$scope.$digest();
    expect(input()).not.toExist();
    var el = f.container.find(".cell.cell-value");
    expect(el.find("span.value:visible")).toHaveText("223");
    expect(el.find("span.units:visible")).toHaveText("V");
  });

  it("should allow value editing for non-readonly cells sending the value upon blur or Enter key press", () => {
    input().val("777").blur();
    f.expectJournal().toEqual([
      "ext: /devices/dev1/controls/voltage1/on: [777] (QoS 1)"
    ]);
    expect(input()).toHaveValue("777");

    input().val("42").simulate("keydown", { keyCode: 13 });
    f.expectJournal().toEqual([
      "ext: /devices/dev1/controls/voltage1/on: [42] (QoS 1)"
    ]);
    expect(input()).toHaveValue("42");
  });

  it("should perform validation based on min/max values", () => {
    expect(input().attr("min")).toBeFalsy();
    expect(input().attr("max")).toBeFalsy();
    f.extClient.send("/devices/dev1/controls/voltage1/meta/min", "-1000", true, 1);
    f.extClient.send("/devices/dev1/controls/voltage1/meta/max", "1000", true, 1);
    f.$scope.$digest();
    input().val("1200").blur();
    expect(input()).toHaveValue("223");
    input().val("-1200").blur();
    expect(input()).toHaveValue("223");
    f.expectJournal().toEqual([]);
  });

  it("should support increment for value controls", () => {
    expect(input().attr("step")).toBeFalsy();
    f.extClient.send("/devices/dev1/controls/voltage1/meta/step", "10", true, 1);
    f.$scope.$digest();
    expect(input().attr("step")).toBe("10");
  });
});
