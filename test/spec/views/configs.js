"use strict";

describe("MQTT RPC", function () {
  var f, vf;

  beforeEach(module('homeuiApp'));
  beforeEach(module('homeuiApp.fakeMqtt'));
  beforeEach(module('homeuiApp.MqttRpc'));
  beforeEach(module('homeuiApp.viewFixture'));

  beforeEach(inject(function (FakeMqttFixture, ViewFixture) {
    f = FakeMqttFixture;
    f.useJSON = true;
    f.connect();
    f.extClient.subscribe("/rpc/v1/confed/Editor/+/+", f.msgLogger("ext"));
    vf = ViewFixture;
    vf.compile("/views/configs.html", "ConfigsCtrl");
  }));

  afterEach(function () {
    vf.remove();
  });

  it("should display a list of configs", function () {
    f.expectJournal().toEqual([
      "ext: /rpc/v1/confed/Editor/List/ui: [-] (QoS 1)",
      {
        id: 1,
        params: {}
      }
    ]);
    f.extClient.send(
      "/rpc/v1/confed/Editor/List/ui/reply",
      JSON.stringify({
        id: 1,
        result: [
          {
            title: "ABC config",
            description: "The config of ABC",
            configPath: "/etc/abc.conf"
          },
          {
            title: "Foobar config",
            configPath: "/etc/foobar.conf"
          }
        ]
      }));
    f.$rootScope.$digest(); // resolve the promise
    var extracted = vf.container.find("table > tbody > tr").toArray().map(function (tr) {
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
      ["#/configs/edit/etc/abc.conf", "/etc/abc.conf", "ABC config", "The config of ABC"],
      ["#/configs/edit/etc/foobar.conf", "/etc/foobar.conf", "Foobar config", ""]
    ]);
  });
});
