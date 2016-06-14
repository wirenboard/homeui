"use strict";

describe("Directive: widget", () => {
  var f;
  beforeEach(module("homeuiApp.mqttDirectiveFixture"));

  beforeEach(inject((MqttDirectiveFixture) => {
    f = new MqttDirectiveFixture("<widget source='widget'></widget>");
    f.extClient.send("/devices/dev1/meta/name", "Dev1", true, 1);
    f.extClient.send("/devices/dev1/controls/temp1/meta/type", "temperature", true, 1);
    f.extClient.send("/devices/dev1/controls/temp1/meta/name", "Temp 1", true, 1);
    f.extClient.send("/devices/dev1/controls/temp1", "42", true, 0);
    f.extClient.send("/devices/dev1/controls/voltage1/meta/type", "voltage", true, 1);
    f.extClient.send("/devices/dev1/controls/voltage1/meta/name", "Voltage 1", true, 1);
    f.extClient.send("/devices/dev1/controls/voltage1", "231", true, 0);
    f.extClient.send("/devices/dev2/controls/baz/meta/type", "text", true, 1);
    f.extClient.send("/devices/dev2/controls/baz", "qqq", true, 0);
    f.$scope.widget = {
      name: "Some widget",
      compact: true,
      cells: [
        { id: "dev1/temp1" },
        { id: "dev1/voltage1" }
      ]
    };
    f.$scope.$digest();
  }));

  it("should display widget title", () => {
    expect(f.container.find(".widget .panel-heading .widget-name")).toHaveText("Some widget");
  });

  function extractCell (el) {
    el = $(el);
    var cell = {};
    if (el.find("h4").size())
      cell.name = el.find("h4").text();
    if (el.find("input").size())
      cell.value = el.find("input").val();
    else if (el.find(".value").size())
      cell.value = el.find(".value").text();
    if (el.find(".units").size())
      cell.units = el.find(".units").text();
    return cell;
  }

  function extractCells () {
    return f.container.find(".display-cell").toArray().map(extractCell);
  }

  it("should display cell values and units in compact mode", () => {
    expect(extractCells()).toEqual([
      { value: "42", units: "°C" },
      { value: "231", units: "V" }
    ]);
  });

  it("should display cell names in non-compact mode", () => {
    f.$scope.widget.compact = false;
    f.$scope.$digest();
    expect(extractCells()).toEqual([
      { name: "Temp 1", value: "42", units: "°C" },
      { name: "Voltage 1", value: "231", units: "V" }
    ]);
  });

  it("should support overriding cell names", () => {
    f.$scope.widget.compact = false;
    f.$scope.widget.cells[0].name = "New name";
    f.$scope.$digest();
    expect(extractCells()).toEqual([
      { name: "New name", value: "42", units: "°C" },
      { name: "Voltage 1", value: "231", units: "V" }
    ]);
  });

  // TBD: editability w/cancellation
  // TBD: don't allow invalid widget to be saved (e.g. with blank / space-only title)
});
