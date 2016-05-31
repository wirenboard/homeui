"use strict";

describe("Directive: console", function () {
  var f, FakeTime, scope, container, element;

  beforeEach(module("homeuiApp"));
  beforeEach(module("homeuiApp.fakeTime"));
  beforeEach(module("homeuiApp.fakeMqtt"));

  beforeEach(inject(function ($rootScope, _FakeTime_, _FakeMqttFixture_, $compile) {
    FakeTime = _FakeTime_;
    // Note that month index '5' means June here due to JS Date() API specifics
    FakeTime.setTime(new Date(2015, 5, 19, 20, 25, 6));
    f = _FakeMqttFixture_;
    f.useJSON = false;
    scope = f.$rootScope.$new();
    container = $("<div></div>")
      .appendTo($("body"));
    element = $compile("<console></console>")(scope, function (clonedElement) {
      container.append(clonedElement);
    });
    f.connect();
    f.$rootScope.$digest();
    element.find(".console-messages").css({
      fontSize: "12px",
      position: "absolute",
      left: 0,
      top: 0,
      width: "200px",
      maxHeight: "50px",
      margin: 0,
      padding: 0,
      overflowY: "auto"
    });
  }));

  afterEach(function () {
    container.remove();
  });

  function extractMessages () {
    return element.find(".console-message").toArray().map(function (el) {
      el = $(el);
      var levelClasses = el.prop("className")
            .replace(/^\s+|\s+$/g, "")
            .split(/\s+/)
            .filter(function (className) {
              return /^console-message-level-/.test(className);
            }),
          ts = el.find(".console-message-ts"),
          text = el.find(".console-message-text");
      expect(levelClasses.length).toBe(1);
      expect(ts).toHaveLength(1);
      expect(text).toHaveLength(1);
      return {
        level: levelClasses[0].replace(/^console-message-level-/, ""),
        ts: ts.text(),
        text: text.text()
      };
    });
  }

  it("should not display any messages initially", function () {
    expect(extractMessages()).toEqual([]);
  });

  it("should receive and display console messages", function () {
    f.extClient.send("/wbrules/log/info", "Info message");
    expect(extractMessages()).toEqual([
      { level: "info", ts: "2015-06-19 20:25:06", text: "Info message" }
    ]);

    FakeTime.setTime(new Date(2015, 5, 19, 20, 25, 16));
    f.extClient.send("/wbrules/log/debug", "Debug message");
    FakeTime.setTime(new Date(2015, 5, 19, 20, 25, 26));
    f.extClient.send("/wbrules/log/warning", "Warning message");
    FakeTime.setTime(new Date(2015, 5, 19, 20, 25, 36));
    f.extClient.send("/wbrules/log/error", "Error message");

    expect(extractMessages()).toEqual([
      { level: "info",    ts: "2015-06-19 20:25:06", text: "Info message" },
      { level: "debug",   ts: "2015-06-19 20:25:16", text: "Debug message" },
      { level: "warning", ts: "2015-06-19 20:25:26", text: "Warning message" },
      { level: "error",   ts: "2015-06-19 20:25:36", text: "Error message" }
    ]);
  });

  it("should scroll to the bottom after receiving messages", function () {
    for (var i = 0; i < 60; ++i) {
      FakeTime.setTime(new Date(2015, 5, 19, 20, 25, 16));
      f.extClient.send("/wbrules/log/info", "Info message");
      if (i > 30)
        f.$timeout.flush();
    }
    var messagesEl = element.find(".console-messages");
    expect(messagesEl).toExist();
    expect(messagesEl.scrollTop()).toBeGreaterThan(0);
    expect(messagesEl.scrollTop()).toBe(messagesEl.prop("scrollHeight") - messagesEl.height());
  });

  describe("toggle switch", function () {
    var sw;

    beforeEach(function () {
      sw = container.find("input[type=checkbox][name='debug']");
      f.extClient.subscribe("/devices/wbrules/controls/Rule debugging/on", f.msgLogger("ext"));
    });

    it("should accept 'Rule debugging' values", function () {
      expect(sw).toExist();
      expect(sw.prop("checked")).toBe(false);
      f.extClient.send("/devices/wbrules/controls/Rule debugging", "1");
      f.$rootScope.$digest();
      expect(sw.prop("checked")).toBe(true);
      f.extClient.send("/devices/wbrules/controls/Rule debugging", "0");
      f.$rootScope.$digest();
      expect(sw.prop("checked")).toBe(false);
    });

    it("should toggle 'Rule debugging' when clicked", function () {
      f.expectJournal().toEqual([]);
      sw.click();
      f.$rootScope.$digest();
      f.expectJournal().toEqual([
        "ext: /devices/wbrules/controls/Rule debugging/on: [1] (QoS 1)"
      ]);
      sw.click();
      f.$rootScope.$digest();
      f.expectJournal().toEqual([
        "ext: /devices/wbrules/controls/Rule debugging/on: [0] (QoS 1)"
      ]);
    });
  });
});
