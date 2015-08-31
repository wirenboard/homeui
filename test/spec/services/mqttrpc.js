"use strict";

describe("MQTT RPC", function () {
  var f, MqttRpc, proxy;

  // load the controller's module
  beforeEach(module('homeuiApp'));
  beforeEach(module('homeuiApp.fakeMqtt'));
  beforeEach(module('homeuiApp.MqttRpc'));

  beforeEach(inject(function (_FakeMqttFixture_, _MqttRpc_) {
    f = _FakeMqttFixture_;
    f.useJSON = true;
    MqttRpc = _MqttRpc_;
    f.connect();
    f.extClient.subscribe("/rpc/v1/fooserv/+/+/+", f.msgLogger("ext"));
    proxy = MqttRpc.getProxy("fooserv/Arith", ["Multiply", "Divide"], "myproxy");
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
      f.$rootScope.$digest(); // resolve the promise
      expect(result).toBe(r);
    }
  });

  it("should activate the spinner while the call is active", function () {
    var proxy1 = MqttRpc.getProxy("fooserv/Arith", ["Multiply", "Divide"], "myproxy1");
    var r1, r2;
    expect(f.$rootScope.spinnerActive()).toBe(false);
    expect(f.$rootScope.spinnerActive("myproxy")).toBe(false);
    expect(f.$rootScope.spinnerActive("myproxy1")).toBe(false);

    proxy.Multiply({ A: 2, B: 2 }).then(function (r) {
      r1 = r;
    });
    expect(f.$rootScope.spinnerActive()).toBe(true);
    expect(f.$rootScope.spinnerActive("myproxy")).toBe(true);
    expect(f.$rootScope.spinnerActive("myproxy1")).toBe(false);
    f.expectJournal().toEqual([
      "ext: /rpc/v1/fooserv/Arith/Multiply/ui: [-] (QoS 1)",
      {
        id: 1,
        params: { A: 2, B: 2 }
      }
    ]);

    proxy1.Multiply({ A: 2, B: 5 }).then(function (r) {
      r2 = r;
    });
    expect(f.$rootScope.spinnerActive()).toBe(true);
    expect(f.$rootScope.spinnerActive("myproxy")).toBe(true);
    expect(f.$rootScope.spinnerActive("myproxy1")).toBe(true);
    f.expectJournal().toEqual([
      "ext: /rpc/v1/fooserv/Arith/Multiply/ui: [-] (QoS 1)",
      {
        id: 2,
        params: { A: 2, B: 5 }
      }
    ]);

    f.extClient.send("/rpc/v1/fooserv/Arith/Multiply/ui/reply",
                     JSON.stringify({ id: 1, result: 4 }));
    f.$rootScope.$digest(); // resolve the promise
    expect(r1).toBe(4);
    expect(f.$rootScope.spinnerActive()).toBe(true);
    expect(f.$rootScope.spinnerActive("myproxy")).toBe(false);
    expect(f.$rootScope.spinnerActive("myproxy1")).toBe(true);

    f.extClient.send("/rpc/v1/fooserv/Arith/Multiply/ui/reply",
                     JSON.stringify({ id: 2, result: 10 }));
    f.$rootScope.$digest(); // resolve the promise
    expect(r2).toBe(10);
    expect(f.$rootScope.spinnerActive()).toBe(false);
    expect(f.$rootScope.spinnerActive("myproxy")).toBe(false);
    expect(f.$rootScope.spinnerActive("myproxy1")).toBe(false);
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
    f.$rootScope.$digest(); // resolve the promise
    expect(error).toEqual({
      code: -1,
      message: "divide by zero"
    });
  });

  it("should fail immediately if the client is not connected", function () {
    f.mqttClient.disconnect();
    f.$rootScope.$digest();
    var error = null;
    proxy.Divide({ A: 42, B: 2 }).then(function (r) {
      error = "succeeded in calling via the disconnected client";
    }, function (err) {
      error = err;
    });
    f.$rootScope.$digest();
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

    f.$rootScope.$digest(); // make sure accidental cancellation doesn't happen here
    expect(error).toBeNull();

    f.mqttClient.disconnect();
    f.$rootScope.$digest();
    expect(error).toEqual({
      data: "MqttConnectionError",
      message: "MQTT client is not connected"
    });
  });

  it("should time out if the request takes too long to complete", function () {
    var error = null;
    proxy.Divide({ A: 42, B: 2 }).then(function (r) {
      error = "RPC call succeeded after timeout?";
    }, function (err) {
      error = err;
    });

    f.$rootScope.$digest(); // make sure accidental cancellation doesn't happen here
    expect(error).toBeNull();

    f.$timeout.flush();
    f.$rootScope.$digest();
    expect(error).toEqual({
      data: "MqttTimeoutError",
      message: "MQTT RPC request timed out"
    });
  });
});
