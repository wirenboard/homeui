"use strict";

describe("History view", function () {
  var f,
      TOPIC1 = "/devices/somedev/controls/somectl",
      TOPIC2 = "/devices/somedev/controls/anotherctl";

  beforeEach(function () {
    module("homeuiApp.mqttRpcViewFixture");
    module(function ($provide) {
      // make sure we don't have to update the test
      // every time the limit is reconfigured
      $provide.value("historyMaxPoints", 5);
    });
  });

  function date (day) {
    // Note that 8 means September here.
    return new Date(2015, 8, day);
  }

  function ts (day) {
    return date(day).getTime() / 1000;
  }

  function setup (routeParams) {
    return function () {
      f.setup("/rpc/v1/db_logger/history", "/views/history.html", "HistoryCtrl", {
        // Fake control list
        CommonCode: {
          data: {
            controls: [
              { topic: TOPIC1 },
              { topic: TOPIC2 }
            ]
          }
        },
        $routeParams: routeParams || {}
      });
    };
  }

  beforeEach(inject(function (MqttRpcViewFixture) {
    f = MqttRpcViewFixture;
    spyOn(f.$location, "path");
  }));

  afterEach(function () {
    // catch any unexpected location changes
    expect(f.$location.path).not.toHaveBeenCalled();
    f.remove();
  });

  describe("with no topic selected", function () {
    beforeEach(setup());

    it("should not display start/end dates and the chart until the topic is selected", function () {
      expect($("#history-start, #history-end")).not.toBeVisible();
      // The chart must no be a part of DOM at this point
      // or it will have resize issues
      expect($("#histchart")).not.toExist();
    });

    it("should list controls in the <select>", function () {
      var options = $("#control-select option").toArray().map(function (opt) {
        return [opt.value, $(opt).text().replace(/^s\*|\s*$/g, "")];
      });
      expect(options).toEqual([
        ["", "- Please Choose -"],
        [TOPIC1, TOPIC1],
        [TOPIC2, TOPIC2]
      ]);
    });

    it("should jump to topic history URL after selecting topic", function () {
      $("#control-select option:eq(1)").prop("selected", true);
      $("#control-select").trigger("change");
      expect(f.$location.path).toHaveBeenCalledWith("/history/somedev/somectl/-/-");
      f.$location.path.calls.reset();
    });
  });

  describe("with topic selected", function () {
    beforeEach(setup({ device: "somedev", control: "somectl" }));

    function load (hasMore) {
      var resp = {
        values: [
          { timestamp: ts(1), value: 10 },
          { timestamp: ts(2), value: 20 },
          { timestamp: ts(3), value: 30 },
          { timestamp: ts(4), value: 40 },
          { timestamp: ts(5), value: 50 }
        ]
      };
      if (hasMore)
        resp.has_more = true;
      f.expectRequest("/rpc/v1/db_logger/history/get_values", {
        channels: [["somedev", "somectl"]],
        limit: 5
      }, resp);
    }

    it("should display selected topic in the select", function () {
      expect($("#control-select").val()).toBe(TOPIC1);
    });

    it("should display start/end date controls", function () {
      expect($("#history-start, #history-end")).toBeVisible();
    });

    it("should request topic history without start/end dates", function () {
      load();
    });

    it("should display chart once values are loaded", function () {
      load();
      expect("#histchart").toBeVisible();
    });

    it("should list reported values in the table", function () {
      load();
      var extractedValues = $("table.table > tbody > tr").toArray().map(function (tr) {
        return $(tr).find("td").toArray().map(function (td) {
          return $(td).text().replace(/^\s*|\s*$/g, "");
        });
      });
      expect(extractedValues).toEqual([
        ["2015-09-01 00:00:00", "10"],
        ["2015-09-02 00:00:00", "20"],
        ["2015-09-03 00:00:00", "30"],
        ["2015-09-04 00:00:00", "40"],
        ["2015-09-05 00:00:00", "50"]
      ]);
    });

    it("should jump to URL with start date once start date is selected", function () {
      load();
      $("#history-start").data("setDate")(date(2));
      f.$rootScope.$digest();
      expect(f.$location.path).toHaveBeenCalledWith("/history/somedev/somectl/" + ts(2) * 1000 + "/-");
      f.$location.path.calls.reset();
    });

    it("should jump to URL with end date once end date is selected", function () {
      load();
      $("#history-end").data("setDate")(date(3));
      f.$rootScope.$digest();
      expect(f.$location.path).toHaveBeenCalledWith("/history/somedev/somectl/-/" + ts(3) * 1000);
      f.$location.path.calls.reset();
    });

    it("should display warning in case if maximum number of points is exceeded", function () {
      var msg = null;
      f.$rootScope.$on("alert", function (ev, message, sticky) {
        expect(msg).toBeNull();
        expect(sticky).toBe(true);
        msg = message;
      });
      load(true);
      expect(msg).toBe("Warning: maximum number of points exceeded");
    });
  });

  describe("with topic and start date selected", function () {
    beforeEach(setup({
      device: "somedev",
      control: "somectl",
      start: "" + ts(2) * 1000
    }));

    function load () {
      f.expectRequest("/rpc/v1/db_logger/history/get_values", {
        channels: [["somedev", "somectl"]],
        timestamp: {
          gt: ts(2) - 1
        },
        limit: 5
      }, {
        values: [
          { timestamp: ts(2), value: 20 },
          { timestamp: ts(3), value: 30 },
          { timestamp: ts(4), value: 42 }
        ]
      });
    }

    it("should display selected start date", function () {
      expect($("#history-start").val()).toBe("" + ts(2) * 1000);
    });

    it("should request topic history with start date", function () {
      load();
    });

    it("should jump to URL with start and end date once end date is selected", function () {
      load();
      $("#history-end").data("setDate")(date(3));
      f.$rootScope.$digest();
      expect(f.$location.path)
        .toHaveBeenCalledWith("/history/somedev/somectl/" + ts(2) * 1000 + "/" + ts(3) * 1000);
      f.$location.path.calls.reset();
    });
  });

  describe("with topic and end date selected", function () {
    beforeEach(setup({
      device: "somedev",
      control: "somectl",
      end: "" + ts(3) * 1000
    }));

    function load () {
      f.expectRequest("/rpc/v1/db_logger/history/get_values", {
        channels: [["somedev", "somectl"]],
        timestamp: {
          lt: ts(3) + 86400
        },
        limit: 5
      }, {
        values: [
          { timestamp: ts(1), value: 20 },
          { timestamp: ts(2), value: 20 },
          { timestamp: ts(3), value: 30 }
        ]
      });
    }

    it("should display selected end date", function () {
      expect($("#history-end").val()).toBe("" + ts(3) * 1000);
    });

    it("should request topic history with end date", function () {
      load();
    });

    it("should jump to URL with start and end date once end date is selected", function () {
      load();
      $("#history-start").data("setDate")(date(2));
      f.$rootScope.$digest();
      expect(f.$location.path)
        .toHaveBeenCalledWith("/history/somedev/somectl/" + ts(2) * 1000 + "/" + ts(3) * 1000);
      f.$location.path.calls.reset();
    });
  });

  describe("with topic and start+end dates selected", function () {
    beforeEach(setup({
      device: "somedev",
      control: "somectl",
      start: "" + ts(2) * 1000,
      end: "" + ts(3) * 1000
    }));

    function load () {
      f.expectRequest("/rpc/v1/db_logger/history/get_values", {
        channels: [["somedev", "somectl"]],
        timestamp: {
          gt: ts(2) - 1,
          lt: ts(3) + 86400
        },
        limit: 5
      }, {
        values: [
          { timestamp: ts(2), value: 20 },
          { timestamp: ts(3), value: 30 }
        ]
      });
    }

    it("should request topic history with start and end dates", function () {
      load();
    });
  });
});
