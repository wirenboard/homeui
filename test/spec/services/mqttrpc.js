"use strict";

describe("MQTT RPC", function () {
  var f, MqttRpc, $rootScope;

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
  }));

  it("should support remote calls", function () {
    f.extClient.subscribe("/rpc/v1/fooserv/+/+/+", f.msgLogger("ext"));
    var proxy = MqttRpc.getProxy("fooserv/Arith", ["Multiply"]);
    var result = null;
    proxy.Multiply({ A: 3, B: 2 }).then(function (r) {
      result = r;
    });
    f.expectJournal().toEqual([
      "ext: /rpc/v1/fooserv/Arith/Multiply/ui: [-] (QoS 1)",
      {
        id: 1,
        params: { A: 3, B: 2 }
      }
    ]);
    f.extClient.send("/rpc/v1/fooserv/Arith/Multiply/ui/reply",
                     JSON.stringify({ id: "1", result: 6 }));
    $rootScope.$digest(); // resolve the promise
    expect(result).toBe(6);
  });

  // TBD: test more ids (use loop with increasing A and B, as in rpc_test.go)
  // TBD: test exceptions
  // TBD: test disconnected client (fail)
  // TBD: make inflight calls fail when the client disconnects
});
