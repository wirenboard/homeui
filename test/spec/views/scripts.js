"use strict";

describe("Scripts view", () => {
  var f;
  beforeEach(module("homeuiApp.mqttRpcViewFixture"));

  beforeEach(inject(MqttRpcViewFixture => {
    f = new MqttRpcViewFixture("/rpc/v1/wbrules/Editor", "views/scripts.html", "ScriptsCtrl");
  }));

  afterEach(() => { f.remove(); });

  it("should display a list of scripts", () => {
    f.expectRequest("/rpc/v1/wbrules/Editor/List", {}, [
      { virtualPath: "abc.js" },
      { virtualPath: "foobar.js" }
    ]);
    var extracted = f.container.find("li > a").toArray().map(el => [el.hash, el.textContent]);
    expect(extracted).toEqual([
      ["#/scripts/new", "New..."],
      ["#/scripts/edit/abc.js", "abc.js"],
      ["#/scripts/edit/foobar.js", "foobar.js"]
    ]);
  });
});
