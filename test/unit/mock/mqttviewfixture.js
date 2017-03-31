import appModule from '../../../app/scripts/app';
import fakeMqttModule from './fakemqtt';
import viewFixtureModule from './viewfixture';

export default angular.module("homeuiApp.mqttViewFixture", [appModule, fakeMqttModule, viewFixtureModule])
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
  })
  .name;
