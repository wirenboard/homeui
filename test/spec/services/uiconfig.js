"use strict";

describe("uiConfig service", () => {
  var $rootScope, uiConfig;
  beforeEach(module("homeuiApp"));
  beforeEach(inject((_$rootScope_, _uiConfig_) => {
    $rootScope = _$rootScope_;
    uiConfig = _uiConfig_;
  }));

  var DEFAULT_DASHBOARD = {
    id: "default",
    name: "Default Dashboard",
    widgets: []
  };

  var WIDGET_1 = {
    id: "widget1",
    name: "Temperatures",
    description: "",
    compact: true,
    cells: [
      { id: "foo/temp1" },
      { id: "foo/temp2" }
    ]
  };
  var WIDGET_2 = {
    id: "widget2",
    name: "Switches",
    description: "",
    compact: true,
    cells: [
      { id: "foo/switch1" },
      { id: "foo/switch2" }
    ]
  };

  function filterDashboard (content) {
    var toCopy = angular.extend({}, content);
    delete toCopy._model;
    return angular.copy(toCopy);
  }

  function data () {
    var r = angular.extend({}, uiConfig.data);
    r.dashboards = r.dashboards.map(filterDashboard);
    r.widgets = angular.copy(r.widgets);
    return r;
  }

  it("should indicate readiness after ready() call", () => {
    var ready = false;
    uiConfig.whenReady().then((data) => {
      expect(data).toBe(uiConfig.data);
      ready = true;
    });
    $rootScope.$digest();
    expect(ready).toBe(false);
    uiConfig.ready({
      widgets: [ WIDGET_1 ]
    });
    $rootScope.$digest();
    expect(ready).toBe(true);
    expect(data().widgets).toEqual([ WIDGET_1 ]);
  });

  it("should contain empty default dashboard initially", () => {
    expect(data().dashboards).toEqual([ DEFAULT_DASHBOARD ]);
  });

  it("should have empty widget list initially", () => {
    expect(data().widgets).toEqual([]);
  });

  it("should auto-number dashboards that are added", () => {
    var newDashboard1 = filterDashboard(uiConfig.addDashboard().content);
    expect(newDashboard1).toEqual({
      id: "dashboard1",
      name: "",
      widgets: [],
      isNew: true
    });
    expect(data().dashboards).toEqual([ DEFAULT_DASHBOARD, newDashboard1 ]);

    var newDashboard2 = filterDashboard(uiConfig.addDashboard().content);
    expect(newDashboard2).toEqual({
      id: "dashboard2",
      name: "",
      widgets: [],
      isNew: true
    });
    expect(data().dashboards).toEqual([
      DEFAULT_DASHBOARD,
      newDashboard1,
      newDashboard2
    ]);
  });

  it("should auto-number widgets that are added", () => {
    var newWidget1 = uiConfig.addWidget();
    expect(newWidget1).toEqual({
      id: "widget1",
      name: "",
      description: "",
      compact: true,
      cells: [],
      isNew: true
    });
    expect(data().widgets).toEqual([ newWidget1 ]);

    var newWidget2 = uiConfig.addWidget();
    expect(newWidget2).toEqual({
      id: "widget2",
      name: "",
      description: "",
      compact: true,
      cells: [],
      isNew: true
    });
    expect(data().widgets).toEqual([ newWidget1, newWidget2 ]);
  });

  function addSampleData () {
    uiConfig.data.widgets.push(WIDGET_1);
    uiConfig.data.widgets.push(WIDGET_2);
    uiConfig.data.dashboards.push({
      id: "dashboard1",
      name: "Dashboard 1",
      widgets: [
        "widget1",
        "widget2"
      ]
    });
  }

  it("should return dashboard model object via getDashboard()", () => {
    addSampleData();
    var dashboard = uiConfig.getDashboard("dashboard1");
    expect(dashboard.id).toBe("dashboard1");
    expect(dashboard.name).toBe("Dashboard 1");
    expect(dashboard.widgets).toEqual([ WIDGET_1, WIDGET_2 ]);
    expect(uiConfig.getDashboard("dashboard1")).toBe(dashboard);
  });

  it("should handle reordering of widgets in the dashboard", () => {
    addSampleData();
    var dashboard = uiConfig.getDashboard("dashboard1");
    expect(dashboard.widgets).toEqual([ WIDGET_1, WIDGET_2 ]);
    dashboard.widgets.splice(0, 1);
    dashboard.widgets.push(WIDGET_1);
    $rootScope.$digest();
    expect(dashboard.widgets).toEqual([ WIDGET_2, WIDGET_1 ]);
    expect(data().dashboards[1]).toEqual({
      id: "dashboard1",
      name: "Dashboard 1",
      widgets: [
        "widget2",
        "widget1"
      ]
    });
  });

  it("should forward changes in config data back to dashboard model", () => {
    addSampleData();
    var dashboard = uiConfig.getDashboard("dashboard1");
    // collection watchers invoked for the first time during the following
    // digest, don't make changes before it happened
    $rootScope.$digest();
    expect(dashboard.widgets).toEqual([ WIDGET_1, WIDGET_2 ]);
    uiConfig.data.dashboards[1].widgets = ["widget2"];
    $rootScope.$digest();
    expect(dashboard.widgets).toEqual([ WIDGET_2 ]);
  });

  it("should reflect back changes in dashboard id and name", () => {
    // XXX: perhaps should validate ids (look for duplicates)
    addSampleData();
    var dashboard = uiConfig.getDashboard("dashboard1");
    dashboard.id = "somedashboard";
    dashboard.name = "Some Dashboard";
    expect(data().dashboards[1]).toEqual({
      id: "somedashboard",
      name: "Some Dashboard",
      widgets: [
        "widget1",
        "widget2"
      ]
    });
  });

  it("should support deleting dashboards", () => {
    addSampleData();
    var dashboard = uiConfig.getDashboard("dashboard1");
    dashboard.remove();
    expect(data().dashboards).toEqual([ DEFAULT_DASHBOARD ]);
  });

  it("should reflect 'new' status in dashboard model", () => {
    addSampleData();
    var dashboard = uiConfig.getDashboard("dashboard1");
    expect(dashboard.isNew).toBe(false);
    expect(uiConfig.addDashboard().isNew).toBe(true);
  });

  it("should support removing widgets from dashboard", () => {
    addSampleData();
    var dashboard = uiConfig.getDashboard("dashboard1");
    dashboard.removeWidgetFromDashboard(WIDGET_1);
    $rootScope.$digest();
    expect(data().dashboards).toEqual([
      DEFAULT_DASHBOARD,
      {
        id: "dashboard1",
        name: "Dashboard 1",
        widgets: [
          "widget2"
        ]
      }
    ]);
    expect(data().widgets).toEqual([ WIDGET_1, WIDGET_2 ]);
  });

  it("should support deleting widgets", () => {
    addSampleData();
    var dashboard = uiConfig.getDashboard("dashboard1"),
        newDashboard = uiConfig.addDashboard();
    newDashboard.widgets.push(WIDGET_1);
    $rootScope.$digest();
    expect(data().dashboards).toEqual([
      DEFAULT_DASHBOARD,
      {
        id: "dashboard1",
        name: "Dashboard 1",
        widgets: [
          "widget1",
          "widget2"
        ]
      },
      {
        id: "dashboard2",
        name: "",
        widgets: [
          "widget1"
        ],
        isNew: true
      }
    ]);

    uiConfig.deleteWidget(WIDGET_1);
    expect(data().dashboards).toEqual([
      DEFAULT_DASHBOARD,
      {
        id: "dashboard1",
        name: "Dashboard 1",
        widgets: [
          "widget2"
        ]
      },
      {
        id: "dashboard2",
        name: "",
        widgets: [],
        isNew: true
      }
    ]);
    expect(data().widgets).toEqual([ WIDGET_2 ]);
  });

  it("should return filtered content (no new records, no extra props) via filtered()", () => {
    addSampleData();
    uiConfig.getDashboard("dashboard1"); // make sure the _model attribute is added
    uiConfig.addWidget();
    uiConfig.addDashboard();
    expect(uiConfig.filtered()).toEqual(
      {
        dashboards: [
          DEFAULT_DASHBOARD,
          {
            id: "dashboard1",
            name: "Dashboard 1",
            widgets: [
              "widget1",
              "widget2"
            ]
          }
        ],
        widgets: [ WIDGET_1, WIDGET_2 ]
      });
  });

  it("should track config changes by incrementing comment versions", () => {
    addSampleData();
    expect(uiConfig.version()).toEqual(1);

    uiConfig.getDashboard("dashboard1").name = "xxx";
    $rootScope.$digest();
    expect(uiConfig.version()).toEqual(2);

    uiConfig.data.widgets[1].name = "zzz";
    $rootScope.$digest();
    expect(uiConfig.version()).toEqual(3);

    uiConfig.data.dashboards.length = 0;
    $rootScope.$digest();
    expect(uiConfig.version()).toEqual(4);

    uiConfig.data.widgets.length = 0;
    $rootScope.$digest();
    expect(uiConfig.version()).toEqual(5);
  });

  // TBD: later: add Widget model, use props to mark widgets/dashboards as dirty
});
