"use strict";

describe("Scripts view", function () {
  var f;

  beforeEach(module("homeuiApp.mqttRpcViewFixture"));

  beforeEach(inject(function (MqttRpcViewFixture) {
    f = MqttRpcViewFixture;
    f.setup("/rpc/v1/wbrules/Editor", "views/scripts.html", "ScriptsCtrl");
  }));

  afterEach(function () {
    f.remove();
  });

  it("should display a list of scripts", function () {
    f.expectRequest("/rpc/v1/wbrules/Editor/List", {}, [
      { virtualPath: "abc.js" },
      { virtualPath: "foobar.js" }
    ]);
    var extracted = f.container.find("li > a").toArray().map(function (el) {
      return [el.hash, el.textContent];
    });
    expect(extracted).toEqual([
      ["#/scripts/new", "New..."],
      ["#/scripts/edit/abc.js", "abc.js"],
      ["#/scripts/edit/foobar.js", "foobar.js"]
    ]);
  });
});
