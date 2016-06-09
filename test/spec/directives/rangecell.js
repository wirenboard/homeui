"use strict";

describe("Directive: range-cell", () => {
  var f;
  beforeEach(module("homeuiApp.mqttDirectiveFixture"));

  beforeEach(inject((MqttDirectiveFixture) => {
    f = new MqttDirectiveFixture("<range-cell cell='dev2/bar'></range-cell>");
    f.extClient.send("/devices/dev2/controls/bar/meta/type", "range", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/min", "-1000", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/max", "1000", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/step", "10", true, 1);
    f.extClient.send("/devices/dev2/controls/bar", "123", true, 0);
    f.$scope.$digest();
  }));

  afterEach(() => { f.remove(); });

  function input () {
    return f.container.find("input[type=range].cell.cell-range:visible");
  }

  it("should display the value of the cell", () => {
    expect(input()).toHaveLength(1);
    expect(input()).toBeVisible();
    expect(input()).toHaveValue("123");
  });

  it("it should apply min/max and step values to the slider", () => {
    expect(input().attr("min")).toBe("-1000");
    expect(input().attr("max")).toBe("1000");
    expect(input().attr("step")).toBe("10");
  });

  it("should display readonly cell values in readonly text field", () => {
    f.extClient.send("/devices/dev2/controls/bar/meta/readonly", "1", true, 1);
    f.$scope.$digest();
    expect(input()).toHaveValue("123");
    expect(input().prop("readonly")).toBe(true);
  });

  it("should allow value editing for non-readonly cells", () => {
    input().val("770").change();
    f.expectJournal().toEqual([
      "ext: /devices/dev2/controls/bar/on: [770] (QoS 1)"
    ]);
    expect(input()).toHaveValue("770");
  });
});
