"use strict";

describe("Fake MQTT", function () {
  var mqttBroker, mqttClient, extClient, $timeout;
  var journal = [];

  // load the controller's module
  beforeEach(module('homeuiApp'));
  beforeEach(module('homeuiApp.fakeMQTT'));

  beforeEach(inject(function (_mqttBroker_, _mqttClient_, _$timeout_) {
    mqttBroker = _mqttBroker_;
    mqttClient = _mqttClient_;
    $timeout = _$timeout_;
    extClient = mqttBroker.createClient();
    journal = [];
  }));

  function connect () {
    extClient.connect("localhost", 1883, "extclient", "", "");
    mqttClient.connect("localhost", 1883, "ui", "", "");
    $timeout.flush();
  }

  it("should change status upon connection", function () {
    connect();
    expect(extClient.isConnected()).toBe(true);
    expect(mqttClient.isConnected()).toBe(true);
  });

  function msgLogger (title) {
    return function (msg) {
      journal.push(title + ": " + msg.topic + ": [" + msg.payload + "] (QoS " + msg.qos +
                   (msg.retained ? ", retained)" : ")"));
    };
  }

  function expectJournal() {
    var r = journal;
    journal = [];
    return expect(r);
  }

  it("should support subscriptions", function () {
    connect();
    mqttClient.subscribe("/abc/def", msgLogger("local"));
    extClient.send("/abc/def", "foobar", false);
    expectJournal().toEqual(["local: /abc/def: [foobar] (QoS 1)"]);

    extClient.subscribe("/#", msgLogger("ext_all"));
    extClient.subscribe("/abc/+", msgLogger("ext_abc_plus"));
    extClient.subscribe("/def/+", msgLogger("nonmatch1"));
    extClient.subscribe("/def/#", msgLogger("nonmatch2"));
    extClient.send("/abc/def", "foo", false);
    expectJournal().toEqual([
      "ext_all: /abc/def: [foo] (QoS 1)",
      "ext_abc_plus: /abc/def: [foo] (QoS 1)",
      "local: /abc/def: [foo] (QoS 1)"
    ]);

    mqttClient.send("/abc/def", "bar", false);
    expectJournal().toEqual([
      "ext_all: /abc/def: [bar] (QoS 1)",
      "ext_abc_plus: /abc/def: [bar] (QoS 1)",
      "local: /abc/def: [bar] (QoS 1)"
    ]);

    mqttClient.unsubscribe("/abc/def");
    mqttClient.send("/abc/def", "bar", false);
    expectJournal().toEqual([
      "ext_all: /abc/def: [bar] (QoS 1)",
      "ext_abc_plus: /abc/def: [bar] (QoS 1)",
    ]);

    mqttClient.send("/abc/def/whatever", "qqq", true, 2);
    expectJournal().toEqual([
      "ext_all: /abc/def/whatever: [qqq] (QoS 2, retained)",
    ]);

    extClient.unsubscribe("/#");

    mqttClient.send("/zzz", "abc", false);
    extClient.send("/fff", "abc", false);
    expectJournal().toEqual([]);
  });
});
