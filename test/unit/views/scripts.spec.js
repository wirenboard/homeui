import mqttRpcViewFixture from '../mock/mqttrpcviewfixture';
import ctrlModule from '../../../app/scripts/controllers/scriptsController';

describe("Scripts view", () => {
  var f;

  beforeEach(angular.mock.module('htmlTemplates'));

  beforeEach(angular.mock.module(mqttRpcViewFixture, ctrlModule.name));

  beforeEach(angular.mock.inject(MqttRpcViewFixture => {
    f = new MqttRpcViewFixture("/rpc/v1/wbrules/Editor", "views/scripts.html", "ScriptsCtrl");
  }));

  afterEach(() => { f.remove(); });

  it("should display a list of scripts", () => {
    f.expectRequest("/rpc/v1/wbrules/Editor/List", {}, [
      { virtualPath: "abc.js" },
      { virtualPath: "foobar.js" }
    ]);
    var extracted = f.container.find("li > a").toArray().map(el => [el.hash, el.textContent.trim()]);
    expect(extracted).toEqual([
      ["#!/scripts/new", "New..."],
      ["#!/scripts/edit/abc.js", "abc.js"],
      ["#!/scripts/edit/foobar.js", "foobar.js"]
    ]);
  });
});
