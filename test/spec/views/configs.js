"use strict";

describe("Configs view", function () {
  var f;

  beforeEach(module("homeuiApp.mqttRpcViewFixture"));

  beforeEach(inject(function (MqttRpcViewFixture) {
    f = MqttRpcViewFixture;
    f.setup("/rpc/v1/confed/Editor", "views/configs.html", "ConfigsCtrl");
  }));

  afterEach(function () {
    f.remove();
  });

  it("should display a list of configs", function () {
    f.expectRequest("/rpc/v1/confed/Editor/List", {}, [
      {
        title: "ABC config",
        description: "The config of ABC",
        configPath: "/etc/abc.conf",
        schemaPath: "/usr/share/wb-mqtt-confed/schemas/abc.schema.json"
      },
      {
        title: "Foobar config",
        configPath: "/etc/foobar.conf",
        schemaPath: "/usr/share/wb-mqtt-confed/schemas/foobar.schema.json"
      }
    ]);
    var extracted = f.container.find("table > tbody > tr").toArray().map(function (tr) {
      return [$(tr).find("a").prop("hash")]
        .concat(
          $(tr).find("td")
            .toArray()
            .map(function (td) {
              return td.textContent.replace(/^\s*|\s*$/g, "");
            }));
    });
    expect(extracted).toEqual([
      // TBD: all config paths should be absolute
      ["#/configs/edit/usr/share/wb-mqtt-confed/schemas/abc.schema.json",
       "/etc/abc.conf", "ABC config", "The config of ABC"],
      ["#/configs/edit/usr/share/wb-mqtt-confed/schemas/foobar.schema.json",
       "/etc/foobar.conf", "Foobar config", ""]
    ]);
  });
});
