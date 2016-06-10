"use strict";

describe("Directive: display-cell", () => {
  var f;
  beforeEach(module("homeuiApp.mqttDirectiveFixture"));

  const CELL_NAME = "Foo Cell";

  beforeEach(inject((MqttDirectiveFixture) => {
    f = new MqttDirectiveFixture("<display-cell cell=\"'dev/foo'\"></display-cell>");
  }));

  afterEach(() => { f.remove(); });

  function publishCell(type, value, meta) {
    meta = angular.extend({}, meta || {}, { type: type });
    Object.keys(meta).sort().forEach(key => {
      f.extClient.send("/devices/dev/controls/foo/meta/" + key, "" + meta[key], true, 1);
    });
    if (value != null)
      f.extClient.send("/devices/dev/controls/foo", value);
    f.$scope.$digest();
  }

  function find (selector) {
    var el = f.container.find(selector);
    expect(el).toHaveLength(1);
    expect(el).toBeVisible();
    return el;
  }

  function expectCellTitle () {
    expect(find(".cell-title")).toHaveText(CELL_NAME);
  }

  function expectNoSeparateCellTitle () {
    expect(f.container.find(".cell-title")).not.toExist();
  }

  it("should display text cells as read-only inputs with title", () => {
    publishCell("text", "foobar", { name: CELL_NAME });
    var el = find("input.cell.cell-text:visible");
    expect(el).toHaveValue("foobar");
    expect(el.prop("readonly")).toBe(true);
    expectCellTitle();
  });

  it("should display wtext cells as editable inputs with title", () => {
    publishCell("wtext", "foobar", { name: CELL_NAME });
    var el = find("input.cell.cell-text:visible");
    expect(el).toHaveValue("foobar");
    expect(el.prop("readonly")).toBe(false);
    expectCellTitle();
  });

  it("should display read-only value cells as read-only number inputs with title and units", () => {
    publishCell("voltage", "231", { name: CELL_NAME });
    var el = find(".cell.cell-value input[type=number]:visible");
    expect(el).toHaveValue("231");
    expect(el.prop("readonly")).toBe(true);
    expect(find(".cell.cell-value .units")).toHaveText("V");
    expectCellTitle();
  });

  it("should display writable value cells as read-only number inputs with title and units", () => {
    publishCell("wvalue", "42", { name: CELL_NAME, units: "l" });
    var el = find(".cell.cell-value input[type=number]:visible");
    expect(el).toHaveValue("42");
    expect(el.prop("readonly")).toBe(false);
    expect(find(".cell.cell-value .units")).toHaveText("l");
    expectCellTitle();
  });

  it("should display pushbutton cells as buttons without extra title", () => {
    publishCell("pushbutton", null, { name: CELL_NAME });
    var el = find("button.cell.cell-button");
    expect(el).toHaveText(CELL_NAME);
    expectNoSeparateCellTitle();
  });

  it("should display alarm cells without extra title", () => {
    publishCell("alarm", 1, { name: CELL_NAME });
    expect(find(".cell.cell-alarm.alarm-active")).toHaveText(CELL_NAME);
  });

  it("should display range cells as input[type=range] with title", () => {
    publishCell("range", 42, { min: 0, max: 100, step: 1, name: CELL_NAME });
    expect(find("input.cell.cell-range")).toHaveValue("42");
    expectCellTitle();
  });

  it("should display switch cells using cell-switch control with title", () => {
    publishCell("switch", "1", { name: CELL_NAME });
    expect(find(".cell.cell-switch .toggle-switch-animate")).toHaveClass("switch-on");
    expectCellTitle();
  });

  it("should display rgb cells using cell-rgb control with title", () => {
    publishCell("rgb", "0;200;255", { name: CELL_NAME });
    expect(find(".cell.cell-rgb .sp-preview-inner").css("background-color").replace(/\s+/g, ""))
      .toEqual("rgb(0,200,255)");
    expectCellTitle();
  });

  it("should reflect cell type in the class of toplevel element", () => {
    publishCell("voltage", "231");
    expect(find(".display-cell")).toHaveClass("cell-type-voltage");
  });
});
