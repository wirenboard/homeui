"use strict";

describe("MQTT RPC", function () {
  var f, MqttRpc, $rootScope, proxy;

  // load the controller's module
  beforeEach(module('homeuiApp'));
  beforeEach(module('homeuiApp.fakeMqtt'));
  beforeEach(module('homeuiApp.MqttRpc'));

  beforeEach(inject(function (_FakeMqttFixture_, _MqttRpc_, _$rootScope_) {
    f = _FakeMqttFixture_;
    f.useJSON = true;
    MqttRpc = _MqttRpc_;
    $rootScope = _$rootScope_;
    f.connect();
    f.extClient.subscribe("/rpc/v1/fooserv/+/+/+", f.msgLogger("ext"));
    proxy = MqttRpc.getProxy("fooserv/Arith", ["Multiply", "Divide"]);
  }));

  it("should support remote calls", function () {
    var result = null;
    for (var i = 1; i < 10; ++i) {
      proxy.Multiply({ A: i, B: i + 1 }).then(function (r) {
        result = r;
      });
      f.expectJournal().toEqual([
        "ext: /rpc/v1/fooserv/Arith/Multiply/ui: [-] (QoS 1)",
        {
          id: i,
          params: { A: i, B: i + 1 }
        }
      ]);
      var r = i * (i + 1);
      f.extClient.send("/rpc/v1/fooserv/Arith/Multiply/ui/reply",
                       JSON.stringify({ id: i, result: r }));
      $rootScope.$digest(); // resolve the promise
      expect(result).toBe(r);
    }
  });

  it("should support exceptions", function () {
    var error = null;
    proxy.Divide({ A: 42, B: 0 }).then(function (r) {
      error = "succeeded in dividing by zero";
    }, function (err) {
      error = err;
    });
    f.expectJournal().toEqual([
      "ext: /rpc/v1/fooserv/Arith/Divide/ui: [-] (QoS 1)",
      {
        id: 1,
        params: { A: 42, B: 0 }
      }
    ]);
    f.extClient.send(
      "/rpc/v1/fooserv/Arith/Divide/ui/reply",
      JSON.stringify({
        id: 1,
        error: {
          code: -1,
          message: "divide by zero"
        }
      }));
    $rootScope.$digest(); // resolve the promise
    expect(error).toEqual({
      code: -1,
      message: "divide by zero"
    });
  });

  it("should fail immediately if the client is not connected", function () {
    f.mqttClient.disconnect();
    $rootScope.$digest();
    var error = null;
    proxy.Divide({ A: 42, B: 2 }).then(function (r) {
      error = "succeeded in calling via the disconnected client";
    }, function (err) {
      error = err;
    });
    $rootScope.$digest();
    expect(error).toEqual({
      data: "MqttConnectionError",
      message: "MQTT client is not connected"
    });
  });

  it("should cancel pending requests upon client disconnection", function () {
    var error = null;
    proxy.Divide({ A: 42, B: 2 }).then(function (r) {
      error = "succeeded in calling via the disconnected client";
    }, function (err) {
      error = err;
    });

    $rootScope.$digest(); // make sure accidental cancellation doesn't happen here
    expect(error).toBeNull();

    f.mqttClient.disconnect();
    $rootScope.$digest();
    expect(error).toEqual({
      data: "MqttConnectionError",
      message: "MQTT client is not connected"
    });
  });
});
