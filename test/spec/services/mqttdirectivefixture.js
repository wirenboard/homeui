angular.module("homeuiApp.mqttDirectiveFixture", ["homeuiApp", "homeuiApp.fakeMqtt", "homeuiApp.viewFixture"])
  .factory("MqttDirectiveFixture", function (FakeMqttFixture, HtmlFixture) {
    const DEFAULT_TOPIC = "/devices/+/controls/+/on";

    class MqttDirectiveFixture extends HtmlFixture {
      constructor (html, topic) {
        super(html, { topic: topic || DEFAULT_TOPIC });
      }

      setup (options) {
        FakeMqttFixture.delegateVia(this);
        this.connect();
        this.extClient.subscribe(options.topic, FakeMqttFixture.msgLogger("ext"));
        super.setup(options);
      }
    }

    return MqttDirectiveFixture;
  });
