angular.module("homeuiApp.mqttViewFixture", ["homeuiApp", "homeuiApp.fakeMqtt", "homeuiApp.viewFixture"])
  .factory("MqttViewFixture", (FakeMqttFixture, ViewFixture) => {
    const DEFAULT_TOPIC = "/devices/+/controls/+/on";

    class MqttViewFixture extends ViewFixture {
      constructor (url, controllerName, topic, locals, options) {
        super(url, controllerName, topic, locals, angular.extend({}, options, { topic: topic || DEFAULT_TOPIC }));
      }

      setup (options) {
        FakeMqttFixture.delegateVia(this);
        this.connect();
        this.extClient.subscribe(options.topic, FakeMqttFixture.msgLogger("ext"));
        super.setup(options);
      }
    }

    return MqttViewFixture;
  });
