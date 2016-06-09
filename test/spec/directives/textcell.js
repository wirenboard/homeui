"use strict";

describe("Directive: text-cell", () => {
  var f;
  beforeEach(module("homeuiApp.mqttDirectiveFixture"));

  beforeEach(inject((MqttDirectiveFixture) => {
    f = new MqttDirectiveFixture("<text-cell cell='dev1/foobar'></text-cell>");
    f.extClient.send("/devices/dev1/controls/foobar/meta/type", "wtext", true, 1);
    f.extClient.send("/devices/dev1/controls/foobar", "qqq", true, 0);
    f.$scope.$digest();
  }));

  afterEach(() => { f.remove(); });

  function input () {
    var el = f.container.find("input.cell.cell-text");
    expect(el).toHaveLength(1);
    expect(el).toBeVisible();
    return el;
  }

  it("should display the value of the cell in a text field", () => {
    expect(input()).toHaveValue("qqq");
    expect(input().prop("readonly")).toBe(false);
  });

  it("should display readonly cell values in readonly text field", () => {
    f.extClient.send("/devices/dev1/controls/foobar/meta/readonly", "1", true, 1);
    f.$scope.$digest();
    expect(input()).toHaveValue("qqq");
    expect(input().prop("readonly")).toBe(true);
  });

  it("should allow value editing for non-readonly cells sending the value upon blur or Enter key press", () => {
    input().val("zzz").blur();
    f.expectJournal().toEqual([
      "ext: /devices/dev1/controls/foobar/on: [zzz] (QoS 1)"
    ]);
    expect(input()).toHaveValue("zzz");

    input().val("abc").simulate("keydown", { keyCode: 13 });
    f.expectJournal().toEqual([
      "ext: /devices/dev1/controls/foobar/on: [abc] (QoS 1)"
    ]);
    expect(input()).toHaveValue("abc");
  });

  it("should discard unsent text field changes upon ESC key press", () => {
    input().val("zzz").simulate("keydown", { keyCode: 27 });
    expect(input()).toHaveValue("qqq");
  });
});
