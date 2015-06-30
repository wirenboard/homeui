"use strict";

describe("Fake MQTT", function () {
  var f;

  // load the controller's module
  beforeEach(module('homeuiApp'));
  beforeEach(module('homeuiApp.fakeMqtt'));

  beforeEach(inject(function (_FakeMqttFixture_) {
    f = _FakeMqttFixture_;
    f.useJSON = false;
  }));

  it("should change status upon connection", function () {
    f.connect();
    expect(f.extClient.isConnected()).toBe(true);
    expect(f.mqttClient.isConnected()).toBe(true);
  });

  it("should support subscriptions", function () {
    f.connect();
    f.mqttClient.subscribe("/abc/def", f.msgLogger("local"));
    f.extClient.send("/abc/def", "foobar", false);
    f.expectJournal().toEqual(["local: /abc/def: [foobar] (QoS 1)"]);

    f.extClient.subscribe("/#", f.msgLogger("ext_all"));
    f.extClient.subscribe("/abc/+", f.msgLogger("ext_abc_plus"));
    f.extClient.subscribe("/def/+", f.msgLogger("nonmatch1"));
    f.extClient.subscribe("/def/#", f.msgLogger("nonmatch2"));
    f.extClient.send("/abc/def", "foo", false);
    f.expectJournal().toEqual([
      "ext_all: /abc/def: [foo] (QoS 1)",
      "ext_abc_plus: /abc/def: [foo] (QoS 1)",
      "local: /abc/def: [foo] (QoS 1)"
    ]);

    f.mqttClient.send("/abc/def", "bar", false);
    f.expectJournal().toEqual([
      "ext_all: /abc/def: [bar] (QoS 1)",
      "ext_abc_plus: /abc/def: [bar] (QoS 1)",
      "local: /abc/def: [bar] (QoS 1)"
    ]);

    f.mqttClient.unsubscribe("/abc/def");
    f.mqttClient.send("/abc/def", "bar", false);
    f.expectJournal().toEqual([
      "ext_all: /abc/def: [bar] (QoS 1)",
      "ext_abc_plus: /abc/def: [bar] (QoS 1)",
    ]);

    f.mqttClient.send("/abc/def/whatever", "qqq", true, 2);
    f.expectJournal().toEqual([
      "ext_all: /abc/def/whatever: [qqq] (QoS 2, retained)",
    ]);

    f.extClient.unsubscribe("/#");

    f.mqttClient.send("/zzz", "abc", false);
    f.extClient.send("/fff", "abc", false);
    f.expectJournal().toEqual([]);
  });

  it("should not receive any messages after disconnection", function () {
    f.connect();
    f.mqttClient.subscribe("/abc/def", f.msgLogger("local"));
    f.extClient.send("/abc/def", "foobar", false);
    f.expectJournal().toEqual(["local: /abc/def: [foobar] (QoS 1)"]);

    f.mqttClient.disconnect();
    f.$timeout.flush();
    expect(f.mqttClient.isConnected()).toBe(false);
    expect(f.extClient.isConnected()).toBe(true);
    f.extClient.send("/abc/def", "foobar", false);
    f.expectJournal().toEqual([]);
  });

  it("should be able to reconnect after disconnection, but clearing the old subscriptions", function () {
    f.connect();
    f.mqttClient.subscribe("/abc/def", f.msgLogger("local"));
    f.mqttClient.disconnect();
    f.$timeout.flush();
    f.mqttClient.connect("localhost", 1883, "ui", "", "");
    f.$timeout.flush();
    expect(f.mqttClient.isConnected()).toBe(true);
    expect(f.extClient.isConnected()).toBe(true);

    f.extClient.send("/abc/def", "skipthis", false); // subscription disappeared
    f.mqttClient.subscribe("/abc/def", f.msgLogger("local"));
    f.extClient.send("/abc/def", "foobar", false);
    f.expectJournal().toEqual(["local: /abc/def: [foobar] (QoS 1)"]);
  });

  it("should support whenMqttReady", function () {
    var ready = false;
    f.whenMqttReady().then(function () {
      if (ready)
        throw new Error("promise callback called twice???");
      ready = true;
    });
    expect(ready).toBe(false);
    f.connect();
    expect(ready).toBe(true);
    ready = false;
    f.whenMqttReady().then(function () {
      if (ready)
        throw new Error("promise callback called twice???");
      ready = true;
    });
    f.$rootScope.$digest();
    expect(ready).toBe(true);
  });
});
