"use strict";

describe("Rooms view", () => {
  var f;
  beforeEach(module("homeuiApp.mqttViewFixture"));

  beforeEach(inject(MqttViewFixture => {
    f = new MqttViewFixture("views/devices.html", "DevicesCtrl");
    f.extClient.send("/devices/dev1/meta/name", "Device One");
    f.extClient.send("/devices/dev1/controls/voltage1/meta/type", "voltage", true, 1);
    f.extClient.send("/devices/dev1/controls/voltage1/meta/name", "Voltage 1", true, 1);
    f.extClient.send("/devices/dev1/controls/voltage1", "223", true, 0);
    f.extClient.send("/devices/dev1/controls/volume", "42", true, 0);
    f.extClient.send("/devices/dev1/controls/volume/meta/type", "wvalue", true, 1);
    f.extClient.send("/devices/dev1/controls/volume/meta/units", "l", true, 1);
    f.extClient.send("/devices/dev2/controls/foo/meta/type", "wvalue", true, 1);
    f.extClient.send("/devices/dev2/controls/foo/meta/readonly", "1", true, 1);
    f.extClient.send("/devices/dev2/controls/foo", "4242", true, 0);
    f.extClient.send("/devices/dev2/controls/bar/meta/type", "range", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/min", "-1000", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/max", "1000", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/step", "10", true, 1);
    f.extClient.send("/devices/dev2/controls/bar", "123", true, 0);
    f.$rootScope.$digest();
  }));

  afterEach(() => { f.remove(); });

  it("should display all the devices", () => {
    expect(f.container.find(".panel-heading h3").toArray().map(el => el.textContent))
      .toEqual(["Device One", "dev2"]);
  });

  function extractDevicesWithCells () {
    return f.container.find(".device").toArray().map(el => {
      return {
        name: $(el).find(".panel-heading h3").text(),
        cells: $(el).find(".display-cell").toArray().map(el => $(el).attr("data-cell-id"))
      };
    });
  }

  it("should display cells in device blocks", () => {
    expect(extractDevicesWithCells()).toEqual([
      { name: "Device One", cells: ["dev1/voltage1", "dev1/volume"] },
      { name: "dev2", cells: ["dev2/foo", "dev2/bar"] }
    ]);
  });
});
