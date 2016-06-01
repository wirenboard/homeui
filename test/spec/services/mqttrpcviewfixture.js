angular.module("homeuiApp.mqttRpcViewFixture", ["homeuiApp", "homeuiApp.fakeMqtt", "homeuiApp.MqttRpc", "homeuiApp.viewFixture"])
  .factory("MqttRpcViewFixture", function (FakeMqttFixture, ViewFixture) {
    var reqId = 1;

    function doExpectRequest (topic, params) {
      FakeMqttFixture.expectJournal().toEqual([
        "ext: " + topic + "/ui: [-] (QoS 1)",
        {
          id: reqId,
          params: params
        }
      ]);
    }

    class MqttRpcViewFixture extends ViewFixture {
      constructor (topic, url, controllerName, locals) {
        super(url, controllerName, locals, { topic: topic });
        FakeMqttFixture.delegateVia(this);
      }

      setup (options) {
        FakeMqttFixture.useJSON = true;
        FakeMqttFixture.connect();
        FakeMqttFixture.extClient.subscribe(options.topic + "/+/+", FakeMqttFixture.msgLogger("ext"));
        super.setup(options);
      }

      expectRequest (topic, params, response) {
        doExpectRequest(topic, params);
        this.extClient.send(
          topic + "/ui/reply",
          JSON.stringify({
            id: reqId++,
            result: response
          }));
        this.$rootScope.$digest(); // resolve the promise
      }

      expectRequestAndFail (topic, params, error) {
        doExpectRequest(topic, params);
        this.extClient.send(
          topic + "/ui/reply",
          JSON.stringify({
            id: reqId++,
            error: error
          }));
        this.$rootScope.$digest(); // resolve the promise
      }
    }

    return MqttRpcViewFixture;
  });
