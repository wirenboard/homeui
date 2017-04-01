import mqttRpcViewFixture from '../mock/mqttrpcviewfixture';
import ctrlModule from '../../../app/scripts/controllers/configsController';

describe("Configs view", () => {
  var f;

  beforeEach(angular.mock.module('htmlTemplates'));

  beforeEach(angular.mock.module(mqttRpcViewFixture, ctrlModule.name));

  beforeEach(angular.mock.inject(MqttRpcViewFixture => {
    f = new MqttRpcViewFixture("/rpc/v1/confed/Editor", "views/configs.html", "ConfigsCtrl");
  }));

  afterEach(() => { f.remove(); });

  it("should display a list of configs", () => {
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
    var extracted = f.container.find("table > tbody > tr").toArray().map(
      tr => [$(tr).find("a").prop("hash")].concat(
        $(tr).find("td")
          .toArray()
          .map(td => td.textContent.replace(/^\s*|\s*$/g, ""))));
    expect(extracted).toEqual([
      // TBD: all config paths should be absolute
      ["#!/configs/edit/~2Fusr~2Fshare~2Fwb-mqtt-confed~2Fschemas~2Fabc.schema.json",
       "/etc/abc.conf", "ABC config", "The config of ABC"],
      ["#!/configs/edit/~2Fusr~2Fshare~2Fwb-mqtt-confed~2Fschemas~2Ffoobar.schema.json",
       "/etc/foobar.conf", "Foobar config", ""]
    ]);
  });
});
