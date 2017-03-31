"use strict";

describe("History view", () => {
  var f,
      MqttRpcViewFixture,
      TOPIC1 = "/devices/somedev/controls/somectl",
      TOPIC2 = "/devices/somedev/controls/anotherctl",
      TOPIC3 = "/devices/somedev/controls/yetanotherctl";

  beforeEach(() => {
    module("homeuiApp.mqttRpcViewFixture");
    module($provide => {
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
    return () => {
      f = new MqttRpcViewFixture("/rpc/v1/db_logger/history", "views/history.html", "HistoryCtrl", {
        $routeParams: routeParams || {}
      });
      spyOn(f.$location, "path");
    };
  }

  beforeEach(inject((_MqttRpcViewFixture_, uiConfig) => {
    MqttRpcViewFixture = _MqttRpcViewFixture_;
    uiConfig.data.widgets = [
      {
        id: "widget1",
        name: "Widget 1",
        cells: [
          { id: "somedev/somectl", name: "Some Control" },
          { id: "somedev/anotherctl", name: "Another Control" }
        ]
      },
      {
        id: "widget2",
        name: "Widget 2",
        cells: [
          { id: "somedev/yetanotherctl", name: "Yet Another Control" }
        ]
      }
    ];
    uiConfig.ready();
  }));

  afterEach(() => {
    // catch any unexpected location changes
    expect(f.$location.path).not.toHaveBeenCalled();
    f.remove();
  });

  describe("with no topic selected", () => {
    beforeEach(setup());

    it("should not display start/end dates and the chart until the topic is selected", () => {
      expect($("#history-start, #history-end")).not.toBeVisible();
      // The chart must no be a part of DOM at this point
      // or it will have resize issues
      expect($("#histchart")).not.toExist();
    });

    it("should list controls in the <select>", () => {
      var options = $("#control-select option").toArray().map(
        opt => [opt.value, $(opt).text().replace(/^s\*|\s*$/g, "")]);
      expect(options).toEqual([
        ["", "- Please Choose -"],
        [TOPIC2, "Widget 1 / Another Control"], // alphabetical sort
        [TOPIC1, "Widget 1 / Some Control"],
        [TOPIC3, "Widget 2 / Yet Another Control"]
      ]);
    });

    it("should jump to topic history URL after selecting topic", () => {
      $("#control-select option:eq(2)").prop("selected", true);
      $("#control-select").trigger("change");
      expect(f.$location.path).toHaveBeenCalledWith("/history/somedev/somectl/-/-");
      f.$location.path.calls.reset();
    });
  });

  describe("with topic selected", () => {
    beforeEach(setup({ device: "somedev", control: "somectl" }));

    function load (hasMore) {
      var resp = {
        values: [
          { t: ts(1), v: 10 },
          { t: ts(2), v: 20 },
          { t: ts(3), v: 30 },
          { t: ts(4), v: 40 },
          { t: ts(5), v: 50 }
        ]
      };
      if (hasMore)
        resp.has_more = true;
      f.expectRequest("/rpc/v1/db_logger/history/get_values", {
        channels: [["somedev", "somectl"]],
        limit: 5,
        ver: 1
      }, resp);
    }

    it("should display selected topic in the select", () => {
      expect($("#control-select").val()).toBe(TOPIC1);
    });

    it("should display start/end date controls", () => {
      expect($("#history-start, #history-end")).toBeVisible();
    });

    it("should request topic history without start/end dates", () => {
      load();
    });

    it("should display chart once values are loaded", () => {
      load();
      expect("#histchart").toBeVisible();
    });

    it("should list reported values in the table", () => {
      load();
      var extractedValues = $("table.table > tbody > tr").toArray().map(
        tr =>  $(tr).find("td").toArray().map(
          td => $(td).text().replace(/^\s*|\s*$/g, "")));
      expect(extractedValues).toEqual([
        ["2015-09-01 00:00:00", "10"],
        ["2015-09-02 00:00:00", "20"],
        ["2015-09-03 00:00:00", "30"],
        ["2015-09-04 00:00:00", "40"],
        ["2015-09-05 00:00:00", "50"]
      ]);
    });

    it("should jump to URL with start date once start date is selected", () => {
      load();
      $("#history-start").data("setDate")(date(2));
      f.$rootScope.$digest();
      expect(f.$location.path).toHaveBeenCalledWith("/history/somedev/somectl/" + ts(2) * 1000 + "/-");
      f.$location.path.calls.reset();
    });

    it("should jump to URL with end date once end date is selected", () => {
      load();
      $("#history-end").data("setDate")(date(3));
      f.$rootScope.$digest();
      expect(f.$location.path).toHaveBeenCalledWith("/history/somedev/somectl/-/" + ts(3) * 1000);
      f.$location.path.calls.reset();
    });

    it("should display warning in case if maximum number of points is exceeded", () => {
      var msg = null;
      f.$rootScope.$on("alert", (ev, message, sticky) => {
        expect(msg).toBeNull();
        expect(sticky).toBe(true);
        msg = message;
      });
      load(true);
      expect(msg).toBe("Warning: maximum number of points exceeded. Please select start date.");
    });
  });

  describe("with topic and start date selected", () => {
    beforeEach(() => {
      spyOn(Date, "now").and.returnValue(ts(5) * 1000);
    });
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
        min_interval: 3 * 24 * 3600 * 1000 / 5 * 1.1,
        limit: 5,
        ver: 1
      }, {
        values: [
          { t: ts(2), v: 20 },
          { t: ts(3), v: 30 },
          { t: ts(4), v: 42 }
        ]
      });
    }

    it("should display selected start date", () => {
      expect($("#history-start").val()).toBe("" + ts(2) * 1000);
    });

    it("should request topic history with start date", () => {
      load();
    });

    it("should jump to URL with start and end date once end date is selected", () => {
      load();
      $("#history-end").data("setDate")(date(3));
      f.$rootScope.$digest();
      expect(f.$location.path)
        .toHaveBeenCalledWith("/history/somedev/somectl/" + ts(2) * 1000 + "/" + ts(3) * 1000);
      f.$location.path.calls.reset();
    });
  });

  describe("with topic and end date selected", () => {
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
        limit: 5,
        ver: 1
      }, {
        values: [
          { t: ts(1), v: 20 },
          { t: ts(2), v: 20 },
          { t: ts(3), v: 30 }
        ]
      });
    }

    it("should display selected end date", () => {
      expect($("#history-end").val()).toBe("" + ts(3) * 1000);
    });

    it("should request topic history with end date", () => {
      load();
    });

    it("should jump to URL with start and end date once end date is selected", () => {
      load();
      $("#history-start").data("setDate")(date(2));
      f.$rootScope.$digest();
      expect(f.$location.path)
        .toHaveBeenCalledWith("/history/somedev/somectl/" + ts(2) * 1000 + "/" + ts(3) * 1000);
      f.$location.path.calls.reset();
    });
  });

  describe("with topic and start+end dates selected", () => {
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
        min_interval: 24 * 3600 * 1000 / 5 * 1.1,
        limit: 5,
        ver: 1
      }, {
        values: [
          { t: ts(2), v: 20 },
          { t: ts(3), v: 30 }
        ]
      });
    }

    it("should request topic history with start and end dates", () => {
      load();
    });
  });
});
