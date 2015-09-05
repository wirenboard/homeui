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
    f.extClient.subscribe("/rpc/v1/wbrules/Editor/+/+", f.msgLogger("ext"));
    vf = ViewFixture;
    vf.compile("/views/scripts.html", "ScriptsCtrl");
  }));

  afterEach(function () {
    vf.remove();
  });

  it("should display a list of scripts", function () {
    f.expectJournal().toEqual([
      "ext: /rpc/v1/wbrules/Editor/List/ui: [-] (QoS 1)",
      {
        id: 1,
        params: {}
      }
    ]);
    f.extClient.send(
      "/rpc/v1/wbrules/Editor/List/ui/reply",
      JSON.stringify({
        id: 1,
        result: [
          {
            virtualPath: "abc.js"
          },
          {
            virtualPath: "foobar.js"
          }
        ]
      }));
    f.$rootScope.$digest(); // resolve the promise
    var extracted = vf.container.find("li > a").toArray().map(function (el) {
      return [el.hash, el.textContent];
    });
    expect(extracted).toEqual([
      ["#/scripts/new", "New..."],
      ["#/scripts/edit/abc.js", "abc.js"],
      ["#/scripts/edit/foobar.js", "foobar.js"]
    ]);
  });
});
