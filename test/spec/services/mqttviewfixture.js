angular.module("homeuiApp.mqttViewFixture", ["homeuiApp", "homeuiApp.fakeMqtt", "homeuiApp.viewFixture"])
  .factory("MqttViewFixture", (FakeMqttFixture, ViewFixture) => {
    const DEFAULT_TOPIC = "/devices/+/controls/+/on";

    class MqttViewFixture extends ViewFixture {
      constructor (url, controllerName, locals, options) {
        options = angular.extend({ topic: DEFAULT_TOPIC }, options || {});
        super(url, controllerName, locals, angular.extend({}, options));
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
