import ctrlModule from '../../../app/scripts/controllers/dashboardController';
import mqttViewFixtureModule from '../mock/mqttviewfixture';
import cellPickerMixinModule from '../mock/cellpickermixin';

describe("Dashboard view", () => {
  var f, data, uiConfig;

  beforeEach(angular.mock.module('htmlTemplates'));

  beforeEach(angular.mock.module(mqttViewFixtureModule, cellPickerMixinModule, ctrlModule.name));

  beforeEach(angular.mock.inject((MqttViewFixture, _uiConfig_) => {
    uiConfig = _uiConfig_;
    uiConfig.ready();
    data = uiConfig.data;
    data.widgets = [
      {
        id: "widget1",
        name: "Some widget",
        description: "",
        compact: true,
        cells: [
          { id: "dev1/temp1" },
          { id: "dev1/voltage1" }
        ]
      },
      {
        id: "widget2",
        name: "Another widget",
        description: "",
        compact: false,
        cells: [
          { id: "dev2/baz", name: "Baz" }
        ]
      }
    ];
    data.dashboards = [
      {
        id: "dashboard1",
        name: "Dashboard One",
        widgets: ["widget1", "widget2"]
      },
      { id: "dashboard2", name: "Dashboard Two", widgets: [] }
    ];
    f = new MqttViewFixture("views/dashboard.html", "DashboardCtrl", {
      $stateParams: {
        id: "dashboard1"
      }
    }, { mixins: ["CellPickerMixin"] });
    // XXX: fix: copy/paste from widget.js
    // (should add a new kind of fixture or a helper function)
    f.extClient.send("/devices/dev1/meta/name", "Dev1", true, 1);
    f.extClient.send("/devices/dev1/controls/temp1/meta/type", "temperature", true, 1);
    f.extClient.send("/devices/dev1/controls/temp1/meta/name", "Temp 1", true, 1);
    f.extClient.send("/devices/dev1/controls/temp1", "42", true, 0);
    f.extClient.send("/devices/dev1/controls/voltage1/meta/type", "voltage", true, 1);
    f.extClient.send("/devices/dev1/controls/voltage1/meta/name", "Voltage 1", true, 1);
    f.extClient.send("/devices/dev1/controls/voltage1", "231", true, 0);
    f.extClient.send("/devices/dev2/controls/baz/meta/type", "text", true, 1);
    f.extClient.send("/devices/dev2/controls/baz", "qqq", true, 0);
    f.$rootScope.$digest();
  }));

  afterEach(() => { f.remove(); });

  it("should display dashboard name in the header", () => {
    expect(f.container.find(".page-header")).toContainText("Dashboard One");
  });

  it("should display the widgets defined in config", () => {
    expect(f.container.find(".widget .panel-heading .widget-name").toArray().map(el => $(el).text())).toEqual([
      "Some widget", "Another widget"
    ]);
  });

  function widgetTitleEdit () {
    return f.container.find(".panel-heading input[type=text]");
  }

  it("should make it possible to add new widgets in edit mode", () => {
    f.click("button[name=add-widget]");
    expect(widgetTitleEdit()).toHaveLength(1);
    widgetTitleEdit().val("abc").change();
    f.clickUISelect();
    f.clickChoice("baz");
    expect(f.container.find("button[type=submit]:visible")).not.toBeDisabled();
    f.click("button[type=submit]:visible");

    expect(uiConfig.filtered()).toEqual({
      dashboards: [
        {
          id: "dashboard1",
          name: "Dashboard One",
          widgets: [ "widget1", "widget2", "widget3" ]
        },
        {
          id: "dashboard2",
          name: "Dashboard Two",
          widgets: []
        }
      ],
      widgets: [
        {
          id: "widget1",
          name: "Some widget",
          description: "",
          compact: true,
          cells: [
            { id: "dev1/temp1" },
            { id: "dev1/voltage1" }
          ]
        },
        {
          id: "widget2",
          name: "Another widget",
          description: "",
          compact: false,
          cells: [
            { id: "dev2/baz", name: "Baz" }
          ]
        },
        {
          id: "widget3",
          name: "abc",
          description: "",
          compact: true,
          cells: [
            { id: "dev2/baz" }
          ]
        }
      ]
    });
  });

  it("should support widget removal", () => {
    f.click(".widget:eq(0) .widget-button-remove");
    expect(uiConfig.filtered().dashboards[0].widgets).toEqual([ "widget2"  ]);
    expect(uiConfig.filtered().widgets.map(widget => widget.id)).toEqual([ "widget1", "widget2" ]);
  });

  it("should support widget deletion", () => {
    f.click(".widget:eq(0) .widget-button-delete");
    expect(uiConfig.filtered().dashboards[0].widgets).toEqual([ "widget2"  ]);
    expect(uiConfig.filtered().widgets.map(widget => widget.id)).toEqual([ "widget2" ]);
  });

  it("should remove newly added widgets upon edit cancellation", () => {
    f.click("button[name=add-widget]");
    expect(widgetTitleEdit()).toHaveLength(1);
    f.click("button[name=cancel]:visible"); // :visible to limit to visible widgets
    expect(uiConfig.filtered().dashboards[0].widgets).toEqual([ "widget1", "widget2"  ]);
    expect(uiConfig.filtered().widgets.map(widget => widget.id)).toEqual([ "widget1", "widget2" ]);
  });

  // TBD: scroll the new widget into view
  // TBD: skip 'new' items when saving the config
});
