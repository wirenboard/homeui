angular.module("homeuiApp.mqttRpcViewFixture", ["homeuiApp", "homeuiApp.fakeMqtt", "homeuiApp.MqttRpc", "homeuiApp.viewFixture"])
  .factory("MqttRpcViewFixture", function (FakeMqttFixture, ViewFixture) {
    var vf = Object.create(ViewFixture),
        reqId = 1;

    for (var k in FakeMqttFixture) {
      if (!FakeMqttFixture.hasOwnProperty(k))
        continue;
      var v = FakeMqttFixture[k];
      vf[k] = angular.isFunction(v) ? v.bind(FakeMqttFixture) : v;
    }

    function doExpectRequest (topic, params) {
      FakeMqttFixture.expectJournal().toEqual([
        "ext: " + topic + "/ui: [-] (QoS 1)",
        {
          id: reqId,
          params: params
        }
      ]);
    }

    vf.setup = function setup (topic, url, controllerName, locals) {
        FakeMqttFixture.useJSON = true;
        this.connect();
        this.extClient.subscribe(topic + "/+/+", this.msgLogger("ext"));
        ViewFixture.setup(url, controllerName, locals);
    };

    vf.expectRequest = function expectRequest (topic, params, response) {
      doExpectRequest(topic, params);
      this.extClient.send(
        topic + "/ui/reply",
        JSON.stringify({
          id: reqId++,
          result: response
        }));
      this.$rootScope.$digest(); // resolve the promise
    };

    vf.expectRequestAndFail = function expectRequestAndFail (topic, params, error) {
      doExpectRequest(topic, params);
      this.extClient.send(
        topic + "/ui/reply",
        JSON.stringify({
          id: reqId++,
          error: error
        }));
      this.$rootScope.$digest(); // resolve the promise
    };

    return vf;
  });
