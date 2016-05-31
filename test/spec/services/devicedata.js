"use strict";

describe("DeviceData service", () => {
  var f, DeviceData;
  beforeEach(module("homeuiApp"));
  beforeEach(module("homeuiApp.fakeMqtt"));

  beforeEach(inject(function (FakeMqttFixture, _DeviceData_) {
    f = FakeMqttFixture;
    DeviceData = _DeviceData_;
    f.connect();
    f.extClient.subscribe("/devices/+/controls/+/on", f.msgLogger("sent"));
  }));

  function extractCellData () {
    var r = {};
    Object.keys(DeviceData.cells).forEach(devctl => {
      var origCell = DeviceData.cells[devctl], cell = {};
      expect(origCell.name).toEqual(devctl);
      Object.keys(origCell).forEach(k => {
        if (k != "name")
          cell[k] = origCell[k];
      });
      r[devctl] = cell;
    });
    return r;
  }

  function publishNumericCells() {
    f.extClient.send("/devices/dev1/meta/name", "Device One");
    f.extClient.send("/devices/dev1/controls/voltage1/meta/type", "voltage", true, 1);
    f.extClient.send("/devices/dev1/controls/voltage1", "223", true, 0);
    f.extClient.send("/devices/dev1/controls/volume", "42", true, 0);
    f.extClient.send("/devices/dev1/controls/volume/meta/type", "value", true, 1);
    f.extClient.send("/devices/dev1/controls/volume/meta/units", "l", true, 1);
    f.extClient.send("/devices/dev2/controls/foo/meta/type", "value", true, 1);
    f.extClient.send("/devices/dev2/controls/foo/meta/readonly", "1", true, 1);
    f.extClient.send("/devices/dev2/controls/foo", "4242", true, 0);
    f.extClient.send("/devices/dev2/controls/bar/meta/type", "range", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/min", "-1000", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/max", "1000", true, 1);
    f.extClient.send("/devices/dev2/controls/bar", "123", true, 0);
  }

  it("should provide list of available cells and their properties", () => {
    expect(DeviceData.devices).toEqual({});
    expect(DeviceData.getCellNames()).toEqual([]);
    publishNumericCells();
    expect(DeviceData.devices).toEqual({
      "dev1": { name: "Device One", explicit: true, cellNames: ["dev1/voltage1", "dev1/volume"] },
      "dev2": { name: "dev2", explicit: false, cellNames: ["dev2/bar", "dev2/foo"] }
    });
    expect(DeviceData.getCellNames()).toEqual([
      "dev1/voltage1", "dev1/volume", "dev2/bar", "dev2/foo"
    ]);
    expect(extractCellData()).toEqual({
      "dev1/voltage1": {
        deviceName: "dev1",
        controlName: "voltage1",
        value: 223,
        type: "voltage",
        units: "V",
        readOnly: false,
        error: false,
        min: null,
        max: null
      },
      "dev1/volume": {
        deviceName: "dev1",
        controlName: "volume",
        value: 42,
        type: "value",
        units: "l",
        readOnly: false,
        error: false,
        min: null,
        max: null
      },
      "dev2/foo": {
        deviceName: "dev2",
        controlName: "foo",
        value: 4242,
        type: "value",
        units: "",
        readOnly: true,
        error: false,
        min: null,
        max: null
      },
      "dev2/bar": {
        deviceName: "dev2",
        controlName: "bar",
        value: 123,
        type: "range",
        units: "",
        readOnly: false,
        error: false,
        min: -1000,
        max: 1000
      }
    });
  });

  it("should return cells by name via cell() function", () => {
    publishNumericCells();
    DeviceData.getCellNames().forEach(cellName => {
      expect(DeviceData.cell(cellName)).toBe(DeviceData.cells[cellName]);
    });
  });

  function publishTextCell() {
    f.extClient.send("/devices/dev2/controls/fooText/meta/type", "text", true, 1);
    f.extClient.send("/devices/dev2/controls/fooText", "4242", true, 0);
  }

  it("should treat 'text' type as string", () => {
    publishTextCell();
    expect(extractCellData()).toEqual({
      "dev2/fooText": {
        deviceName: "dev2",
        controlName: "fooText",
        value: "4242",
        type: "text",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
  });

  it("should mark text cells as complete even without value", () => {
    publishTextCell();
    f.extClient.send("/devices/dev2/controls/fooText", "", true, 1);
    // 'text' cells are complete even with empty value
    expect(DeviceData.cell("dev2/fooText").isComplete()).toBe(true);
    expect(extractCellData()).toEqual({
      "dev2/fooText": {
        deviceName: "dev2",
        controlName: "fooText",
        value: "",
        type: "text",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
  });

  function publishSwitchCell() {
    f.extClient.send("/devices/dev2/controls/fooSwitch/meta/type", "switch", true, 1);
    f.extClient.send("/devices/dev2/controls/fooSwitch", "1", true, 0);
  }

  it("should treat 'switch' type as bool", () => {
    publishSwitchCell();
    expect(extractCellData()).toEqual({
      "dev2/fooSwitch": {
        deviceName: "dev2",
        controlName: "fooSwitch",
        value: true,
        type: "switch",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
    f.extClient.send("/devices/dev2/controls/fooSwitch", "0", true, 0);
    expect(extractCellData()).toEqual({
      "dev2/fooSwitch": {
        deviceName: "dev2",
        controlName: "fooSwitch",
        value: false,
        type: "switch",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
  });

  function publishRgbCell() {
    f.extClient.send("/devices/dev2/controls/fooRgb/meta/type", "rgb", true, 1);
    f.extClient.send("/devices/dev2/controls/fooRgb", "0;200;255", true, 0);
  }

  it("should parse rgb values", () => {
    publishRgbCell();
    expect(extractCellData()).toEqual({
      "dev2/fooRgb": {
        deviceName: "dev2",
        controlName: "fooRgb",
        value: { r: 0, g: 200, b: 255 },
        type: "rgb",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
    f.extClient.send("/devices/dev2/controls/fooRgb", "200;100;50", true, 0);
    expect(extractCellData()).toEqual({
      "dev2/fooRgb": {
        deviceName: "dev2",
        controlName: "fooRgb",
        value: { r: 200, g: 100, b: 50 },
        type: "rgb",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
  });

  it("should honour meta/error", () => {
    f.extClient.send("/devices/dev2/controls/foo/meta/type", "value", true, 1);
    f.extClient.send("/devices/dev2/controls/foo", "4242", true, 0);
    expect(extractCellData()).toEqual({
      "dev2/foo": {
        deviceName: "dev2",
        controlName: "foo",
        value: 4242,
        type: "value",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });

    f.extClient.send("/devices/dev2/controls/foo/meta/error", "1", true, 1);
    expect(extractCellData()).toEqual({
      "dev2/foo": {
        deviceName: "dev2",
        controlName: "foo",
        value: 4242,
        type: "value",
        units: "",
        readOnly: false,
        error: true,
        min: null,
        max: null
      }
    });

    f.extClient.send("/devices/dev2/controls/foo/meta/error", "", true, 1);
    expect(extractCellData()).toEqual({
      "dev2/foo": {
        deviceName: "dev2",
        controlName: "foo",
        value: 4242,
        type: "value",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
  });

  function publishIncompleteCell () {
    f.extClient.send("/devices/dev2/controls/fooInc", "4242", true, 0);
    f.extClient.send("/devices/dev2/controls/barInc/meta/type", "value", true, 0);
  }

  it("should treat cells with no type or no value as incomplete", function () {
    publishIncompleteCell();
    expect(extractCellData()).toEqual({
      "dev2/fooInc": {
        deviceName: "dev2",
        controlName: "fooInc",
        value: "4242",
        type: "incomplete",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      },
      "dev2/barInc": {
        deviceName: "dev2",
        controlName: "barInc",
        value: null,
        type: "value",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
    expect(DeviceData.cell("dev2/fooInc").isComplete()).toBe(false);
    expect(DeviceData.cell("dev2/barInc").isComplete()).toBe(false);

    f.extClient.send("/devices/dev2/controls/fooInc/meta/type", "value", true, 0);
    f.extClient.send("/devices/dev2/controls/barInc", "4243", true, 0);
    expect(extractCellData()).toEqual({
      "dev2/fooInc": {
        deviceName: "dev2",
        controlName: "fooInc",
        value: 4242,
        type: "value",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      },
      "dev2/barInc": {
        deviceName: "dev2",
        controlName: "barInc",
        value: 4243,
        type: "value",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
    expect(DeviceData.cell("dev2/fooInc").isComplete()).toBe(true);
    expect(DeviceData.cell("dev2/barInc").isComplete()).toBe(true);
  });

  function publishPushButtonCell () {
    f.extClient.send("/devices/dev2/controls/fooButton/meta/type", "pushbutton", true, 1);
  }

  it("should not need values for pushbutton cells to treat them as complete", () => {
    publishPushButtonCell();
    expect(DeviceData.cell("dev2/fooButton").isComplete()).toBe(true);
    expect(extractCellData()).toEqual({
      "dev2/fooButton": {
        deviceName: "dev2",
        controlName: "fooButton",
        value: null,
        type: "pushbutton",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
  });

  it("should ignore incoming values for pushbutton cells", () => {
    publishPushButtonCell();
    f.extClient.send("/devices/dev2/controls/fooButton", "1", true, 1);
    expect(DeviceData.cell("dev2/fooButton").isComplete()).toBe(true);
    expect(extractCellData()).toEqual({
      "dev2/fooButton": {
        deviceName: "dev2",
        controlName: "fooButton",
        value: null,
        type: "pushbutton",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
  });

  it("should support setting cell values", () => {
    publishNumericCells();
    publishTextCell();
    publishSwitchCell();
    publishRgbCell();
    publishPushButtonCell();

    DeviceData.cells["dev2/bar"].sendValue(42);
    f.expectJournal().toEqual([
      "sent: /devices/dev2/controls/bar/on: [42] (QoS 1)"
    ]);
    expect(DeviceData.cell("dev2/bar").value).toBe(42);

    DeviceData.cells["dev2/fooText"].sendValue("123");
    f.expectJournal().toEqual([
      "sent: /devices/dev2/controls/fooText/on: [123] (QoS 1)"
    ]);
    expect(DeviceData.cell("dev2/fooText").value).toBe("123");

    DeviceData.cells["dev2/fooText"].sendValue("");
    f.expectJournal().toEqual([
      "sent: /devices/dev2/controls/fooText/on: [] (QoS 1)"
    ]);
    expect(DeviceData.cell("dev2/fooText").value).toBe("");
    expect(DeviceData.cell("dev2/fooText").isComplete()).toBe(true);

    DeviceData.cells["dev2/fooText"].sendValue("abc");
    f.expectJournal().toEqual([
      "sent: /devices/dev2/controls/fooText/on: [abc] (QoS 1)"
    ]);
    expect(DeviceData.cell("dev2/fooText").value).toBe("abc");
    expect(DeviceData.cell("dev2/fooText").isComplete()).toBe(true);

    DeviceData.cells["dev2/fooSwitch"].sendValue(true);
    // value is sent even if it wasn't changed
    f.expectJournal().toEqual([
      "sent: /devices/dev2/controls/fooSwitch/on: [1] (QoS 1)"
    ]);
    expect(DeviceData.cell("dev2/fooSwitch").value).toBe(true);

    DeviceData.cells["dev2/fooSwitch"].sendValue(false);
    f.expectJournal().toEqual([
      "sent: /devices/dev2/controls/fooSwitch/on: [0] (QoS 1)"
    ]);
    expect(DeviceData.cell("dev2/fooSwitch").value).toBe(false);

    DeviceData.cells["dev2/fooRgb"].sendValue({ r: 100, g: 200, b: 210 });
    f.expectJournal().toEqual([
      "sent: /devices/dev2/controls/fooRgb/on: [100;200;210] (QoS 1)"
    ]);
    expect(DeviceData.cell("dev2/fooRgb").value).toEqual({ r: 100, g: 200, b: 210 });

    DeviceData.cells["dev2/fooButton"].sendValue(true);
    f.expectJournal().toEqual([
      "sent: /devices/dev2/controls/fooButton/on: [1] (QoS 1)"
    ]);
    expect(DeviceData.cell("dev2/fooButton").value).toBeNull();
  });

  it("should ignore attempts to set values of incomplete cells", () => {
    publishIncompleteCell();
    DeviceData.cells["dev2/fooInc"].sendValue(100);
    f.expectJournal().toEqual([]);
  });

  it("should ignore attempts to set values of readonly cells", () => {
    publishNumericCells();
    DeviceData.cells["dev2/foo"].sendValue(100);
    f.expectJournal().toEqual([]);
  });

  it("should support changing cell type", () => {
    publishSwitchCell();
    f.extClient.send("/devices/dev2/controls/fooSwitch/meta/type", "value", true, 1);
    expect(extractCellData()).toEqual({
      "dev2/fooSwitch": {
        deviceName: "dev2",
        controlName: "fooSwitch",
        value: 1,
        type: "value",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
  });

  it("should support cell removal", () => {
    f.extClient.send("/devices/dev2/controls/foo/meta/type", "value", true, 1);
    f.extClient.send("/devices/dev2/controls/foo", "4242", true, 0);
    f.extClient.send("/devices/dev2/controls/bar/meta/type", "value", true, 1);
    f.extClient.send("/devices/dev2/controls/bar", "123", true, 0);
    publishSwitchCell();

    f.extClient.send("/devices/dev2/controls/foo/meta/type", "", true, 1);
    f.extClient.send("/devices/dev2/controls/fooSwitch", "", true, 1);
    expect(extractCellData()).toEqual({
      "dev2/foo": {
        deviceName: "dev2",
        controlName: "foo",
        value: "4242",
        type: "incomplete",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      },
      "dev2/bar": {
        deviceName: "dev2",
        controlName: "bar",
        value: 123,
        type: "value",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      },
      "dev2/fooSwitch": {
        deviceName: "dev2",
        controlName: "fooSwitch",
        value: null,
        type: "switch",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
    expect(DeviceData.getCellNames()).toEqual(["dev2/bar"]);

    f.extClient.send("/devices/dev2/controls/foo", "", true, 1);
    f.extClient.send("/devices/dev2/controls/fooSwitch/meta/type", "", true, 1);
    expect(extractCellData()).toEqual({
      "dev2/bar": {
        deviceName: "dev2",
        controlName: "bar",
        value: 123,
        type: "value",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
    expect(DeviceData.getCellNames()).toEqual(["dev2/bar"]);
    expect(DeviceData.devices).toEqual({
      "dev2": { name: "dev2", explicit: false, cellNames: ["dev2/bar"] }
    });
  });

  it("should support removal of additional cell properties(min/max, units, readonly)", () => {
    publishNumericCells();
    f.extClient.send("/devices/dev1/controls/volume/meta/units", "", true, 1);
    f.extClient.send("/devices/dev2/controls/foo/meta/readonly", "", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/min", "", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/max", "", true, 1);
    expect(DeviceData.devices).toEqual({
      "dev1": { name: "Device One", explicit: true, cellNames: ["dev1/voltage1", "dev1/volume"] },
      "dev2": { name: "dev2", explicit: false, cellNames: ["dev2/bar", "dev2/foo"] }
    });
    expect(DeviceData.getCellNames()).toEqual([
      "dev1/voltage1", "dev1/volume", "dev2/bar", "dev2/foo"
    ]);
    expect(extractCellData()).toEqual({
      "dev1/voltage1": {
        deviceName: "dev1",
        controlName: "voltage1",
        value: 223,
        type: "voltage",
        units: "V",
        readOnly: false,
        error: false,
        min: null,
        max: null
      },
      "dev1/volume": {
        deviceName: "dev1",
        controlName: "volume",
        value: 42,
        type: "value",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      },
      "dev2/foo": {
        deviceName: "dev2",
        controlName: "foo",
        value: 4242,
        type: "value",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      },
      "dev2/bar": {
        deviceName: "dev2",
        controlName: "bar",
        value: 123,
        type: "range",
        units: "",
        readOnly: false,
        error: false,
        min: null,
        max: null
      }
    });
  });

  it("should remove devices with no cells and no name", () => {
    f.extClient.send("/devices/dev1/meta/name", "Device One");
    f.extClient.send("/devices/dev1/controls/voltage1/meta/type", "voltage", true, 1);
    f.extClient.send("/devices/dev1/controls/voltage1", "223", true, 1);
    publishPushButtonCell();
    expect(DeviceData.devices).toEqual({
      "dev1": { name: "Device One", explicit: true, cellNames: ["dev1/voltage1"] },
      "dev2": { name: "dev2", explicit: false, cellNames: ["dev2/fooButton"] }
    });
    f.extClient.send("/devices/dev2/controls/fooButton/meta/type", "");
    expect(DeviceData.devices).toEqual({
      "dev1": { name: "Device One", explicit: true, cellNames: ["dev1/voltage1"] }
    });

    f.extClient.send("/devices/dev1/controls/voltage1/meta/type", "");
    // single incomplete cell mentioning Device One (not listed), device not removed due to explicitness
    expect(DeviceData.devices).toEqual({
      "dev1": { name: "Device One", explicit: true, cellNames: [] }
    });

    f.extClient.send("/devices/dev1/controls/voltage1", "");
    // no cells cell in Device One, device not removed due to explicitness
    expect(DeviceData.devices).toEqual({
      "dev1": { name: "Device One", explicit: true, cellNames: [] }
    });

    // dev1 loses its name and is removed
    f.extClient.send("/devices/dev1/meta/name", "");
    expect(DeviceData.devices).toEqual({});
  });

  it("should return the cells of specified type via getCellsByType", () => {
    publishNumericCells();
    publishIncompleteCell();
    // incomplete cells are never included
    expect(DeviceData.getCellNamesByType("value")).toEqual(["dev1/volume", "dev2/foo"]);
    expect(DeviceData.getCellNamesByType("voltage")).toEqual(["dev1/voltage1"]);
  });

  it("should provide cell proxy objects that serve as placeholders for nonexistent cells", () => {
    var proxy = DeviceData.proxy("dev2/bar"); // a proxy for nonexistent cell
    expect(proxy.isComplete()).toBe(false);
    expect(proxy.name).toBe("dev2/bar");
    expect(proxy.value).toBe(null);
    expect(proxy.type).toBe("incomplete");
    expect(proxy.units).toBe("");
    expect(proxy.readOnly).toBe(false);
    expect(proxy.error).toBe(false);
    expect(proxy.min).toBe(null);
    expect(proxy.max).toBe(null);
    proxy.sendValue(999); // does nothing

    publishNumericCells();
    expect(proxy.isComplete()).toBe(true);
    expect(proxy.name).toBe("dev2/bar");
    expect(proxy.value).toBe(123);
    expect(proxy.type).toBe("range");
    expect(proxy.units).toBe("");
    expect(proxy.readOnly).toBe(false);
    expect(proxy.error).toBe(false);
    expect(proxy.min).toBe(-1000);
    expect(proxy.max).toBe(1000);

    proxy.sendValue(42);
    f.expectJournal().toEqual([
      "sent: /devices/dev2/controls/bar/on: [42] (QoS 1)"
    ]);
    expect(proxy.value).toBe(42);

    f.extClient.send("/devices/dev2/controls/bar/meta/readonly", "1", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/units", "m", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/error", "r", true, 1);
    expect(proxy.isComplete()).toBe(true);
    expect(proxy.name).toBe("dev2/bar");
    expect(proxy.value).toBe(42);
    expect(proxy.type).toBe("range");
    expect(proxy.units).toBe("m");
    expect(proxy.readOnly).toBe(true);
    expect(proxy.error).toBe(true);
    expect(proxy.min).toBe(-1000);
    expect(proxy.max).toBe(1000);
  });
});
