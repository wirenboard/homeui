import appModule from '../../../app/scripts/app';
import widgetsModule from '../../../app/scripts/controllers/widgetsController';
import fakeTimeModule from '../mock/faketime';
import mqttViewFixtureModule from '../mock/mqttviewfixture';

describe("Widgets view", () => {
  var f, uiConfig, FakeTime;
  const TIMESTAMP = 1466183742396;

  beforeEach(angular.mock.module('htmlTemplates'));

  beforeEach(angular.mock.module(mqttViewFixtureModule, appModule, widgetsModule.name, fakeTimeModule));

  beforeEach(angular.mock.inject((MqttViewFixture, _uiConfig_, $rootScope, _FakeTime_) => {
    FakeTime = _FakeTime_;
    FakeTime.setTime(TIMESTAMP);
    uiConfig = _uiConfig_;
    uiConfig.data.dashboards = [
      {
        id: "dashboard1",
        name: "Dashboard 1",
        widgets: ["widget1", "widget2"]
      },
      {
        id: "dashboard2",
        name: "Dashboard 2",
        widgets: ["widget2"]
      }
    ];
    uiConfig.data.widgets = [
      {
        id: "widget1",
        name: "Temperatures",
        description: "Some temperatures",
        compact: true,
        cells: [
          { id: "foo/temp1" },
          { id: "foo/temp2" }
        ]
      },
      {
        id: "widget2",
        name: "Switches",
        description: "Some switches",
        compact: true,
        cells: [
          { id: "foo/switch1" },
          { id: "foo/switch2" }
        ]
      }
    ];
    $rootScope.$digest();
    f = new MqttViewFixture("views/widgets.html", "WidgetsCtrl");
    f.extClient.send("/devices/foo/meta/name", "Foo", true, 1);
    f.extClient.send("/devices/foo/controls/temp1/meta/type", "temperature", true, 1);
    f.extClient.send("/devices/foo/controls/temp1/meta/name", "Temp 1", true, 1);
    f.extClient.send("/devices/foo/controls/temp1", "42", true, 0);
    f.extClient.send("/devices/foo/controls/temp2/meta/type", "temperature", true, 1);
    f.extClient.send("/devices/foo/controls/temp2/meta/name", "Temp 2", true, 1);
    f.extClient.send("/devices/foo/controls/temp2", "43", true, 0);
    f.extClient.send("/devices/foo/controls/switch1/meta/type", "switch", true, 1);
    f.extClient.send("/devices/foo/controls/switch1/meta/name", "Switch 1", true, 1);
    f.extClient.send("/devices/foo/controls/switch1", "1", true, 0);
    f.extClient.send("/devices/foo/controls/switch2/meta/type", "switch", true, 1);
    f.extClient.send("/devices/foo/controls/switch2/meta/name", "Switch 2", true, 1);
    f.extClient.send("/devices/foo/controls/switch2", "0", true, 0);
    f.$rootScope.$digest();
  }));

  afterEach(() => {
    f.remove();
  });

  // widget view is alphabetically sorted, thus the order of widgets
  // is reversed
  var EXTRACTED_WIDGET_1 = {
    name: "Temperatures",
    description: "Some temperatures",
    dashboards: ["Dashboard 1"],
    cells: [
      {
        id: "foo/temp1",
        name: "Temp 1",
        type: "temperature",
        value: 42
      },
      {
        id: "foo/temp2",
        name: "Temp 2",
        type: "temperature",
        value: 43
      }
    ]
  };
  var EXTRACTED_WIDGET_2 = {
    name: "Switches",
    description: "Some switches",
    dashboards: ["Dashboard 1", "Dashboard 2"],
    cells: [
      {
        id: "foo/switch1",
        name: "Switch 1",
        type: "switch",
        value: true
      },
      {
        id: "foo/switch2",
        name: "Switch 2",
        type: "switch",
        value: false
      }
    ]
  };

  function extractCell (el) {
    el = $(el);
    var cellValue = el.find(".cell-value .value"),
        switchCell = el.find(".cell-switch");
    return {
      id: el.find(".cell-title .id").text().trim(),
      name: el.find(".cell-title .name").text().trim(),
      type: el.find(".cell-type-col").text().trim(),
      value: cellValue.length ? cellValue.text().trim() - 0 :
        switchCell.length ? !!switchCell.find(".switch-on").length :
        "<unknown>"
    };
  }

  function verifyDashboard (el) {
    var name = $(el).text().trim();
    var dashboard = uiConfig.data.dashboards.find(dashboard => dashboard.name == name);
    expect(dashboard).not.toBeNull();
    if (dashboard)
      expect($(el).prop("hash")).toEqual("#!/dashboards/" + dashboard.id);
    return name;
  }

  function extractWidgets () {
    var item, rowSpan = 0, result = [];
    f.container.find("table tbody tr").toArray().forEach(tr => {
      tr = $(tr);
      if (rowSpan) {
        --rowSpan;
        item.cells.push(extractCell(tr));
        return;
      }
      item = {
        name: $(tr).find(".name-col").text().trim(),
        description: $(tr).find(".description-col").text().trim(),
        dashboards: $(tr).find(".dashboards-col ul li a").toArray().map(verifyDashboard),
        cells: [ extractCell(tr) ]
      };
      if (tr.find(".name-col").prop("rowSpan") > 1)
        rowSpan = tr.find(".name-col").prop("rowSpan") - 1;
      result.push(item);
    });
    return result;
  }

  it("should list all the widgets with their dashboards, cell lists, descriptions and values", () => {
    expect(extractWidgets()).toEqual([
      EXTRACTED_WIDGET_2,
      EXTRACTED_WIDGET_1
    ]);
  });

  it("should not display 'no widgets' placeholder when widget list is not empty", () => {
    expect(f.container.find(".empty-list")).not.toExist();
  });

  it("should display 'no widgets' placeholder and no table when widget list is empty", () => {
    uiConfig.data.dashboards = [];
    uiConfig.data.widgets = [];
    // must invoke $digest() on the root scope so uiConfig version
    // has a chance to update
    f.$rootScope.$digest();
    expect(f.container.find(".empty-list")).toExist();
    expect(f.container.find("table")).not.toExist();
  });

  function extractHistoryLinks () {
    return f.container.find("tbody > tr a.cell-history").toArray().map(a => a.hash);
  }

  it("should provide history links for cells", () => {
    var d = new Date(TIMESTAMP);
    var ts = new Date(d.getFullYear(), d.getMonth(), d.getDate()).valueOf() ;
    ts = '/' + ts + '/-';
    expect(extractHistoryLinks()).toEqual([
      "#!/history/foo/switch1" + ts,
      "#!/history/foo/switch2" + ts,
      "#!/history/foo/temp1" + ts,
      "#!/history/foo/temp2" + ts,
    ]);
  });

  it("should provide 'delete widget' button", () => {
    spyOn(window, "confirm").and.returnValue(true);
    f.click("tbody > tr:eq(0) button[name=delete]");
    expect(uiConfig.data.widgets.map(widget => widget.id)).toEqual([ "widget1" ]);
    expect(extractWidgets()).toEqual([ EXTRACTED_WIDGET_1 ]);
  });

  it("should provide widget preview via 'preview' button", () => {
    f.click("tbody > tr:eq(0) button[name=preview]");
    expect(f.container.find("tbody > tr:eq(0) .cell-name-col")).not.toExist();
    expect(f.container.find("tbody > tr:eq(0) .cell-type-col")).not.toExist();
    expect(f.container.find("tbody > tr:eq(0) .cell-value-col")).not.toExist();
    expect(f.container.find("tbody > tr:eq(0) .cell-history-col")).not.toExist();
    expect(f.container.find("tbody > tr:eq(0) button[name=preview]")).not.toExist();
    // 2nd cell row hidden for the first widget
    expect(f.container.find("tbody > tr:eq(1)")).toContainText("Temperatures");
    expect(f.container.find("tbody > tr:eq(0) .widget .panel-heading")).toContainText("Switches");
  });

  it("should hide widget preview via 'table' button", () => {
    expect("tbody > tr:eq(0) button[name=table]").not.toExist();
    f.click("tbody > tr:eq(0) button[name=preview]");
    f.click("tbody > tr:eq(0) button[name=table]");
    expect(f.container.find("tbody > tr:eq(0) .cell-name-col")).toExist();
    expect(f.container.find("tbody > tr:eq(0) .cell-type-col")).toExist();
    expect(f.container.find("tbody > tr:eq(0) .cell-value-col")).toExist();
    expect(f.container.find("tbody > tr:eq(0) .cell-history-col")).toExist();
    expect(f.container.find("tbody > tr:eq(0) button[name=preview]")).toExist();
    // 2nd cell row hidden for the first widget
    expect(f.container.find("tbody > tr:eq(1) .name-col")).not.toExist();
    expect(f.container.find("tbody > tr:eq(0) .widget .panel-heading")).not.toExist();
    expect(f.container.find("tbody > tr:eq(2)")).toContainText("Temperatures");
    expect("tbody > tr:eq(0) button[name=table]").not.toExist();
  });

  // TBD: adding widgets
});
