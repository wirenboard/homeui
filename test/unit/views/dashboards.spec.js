"use strict";

describe("Dashboards view", () => {
  var f, uiConfig;

  beforeEach(module("homeuiApp.viewFixture"));

  beforeEach(inject((ViewFixture, _uiConfig_, $rootScope) => {
    uiConfig = _uiConfig_;
    uiConfig.data.dashboards = [];
    $rootScope.$digest();
    f = new ViewFixture("views/dashboards.html", "DashboardsCtrl");
  }));

  afterEach(() => {
    f.remove();
  });

  it("should not display any dashboards when there's no dashboards defined", () => {
    expect("table").not.toExist();
    expect(".empty-list").toExist();
  });

  function dashboards () {
    return uiConfig.data.dashboards.map(dashboard => {
      var toCopy = angular.extend({}, dashboard);
      delete toCopy._model;
      // angular.copy() removes $$hashKey properties
      return angular.copy(toCopy);
    });
  }

  function extractDashboards () {
    return f.container.find("table > tbody > tr.dashboard:visible").toArray().map(tr => {
      var name = $(tr).find("td").eq(0).text().replace(/^\s+|\s+$/g, ""),
          id = $(tr).find("td").eq(1).text().replace(/^\s+|\s+$/g, ""),
          link = $(tr).find("td:eq(2) a").prop("hash");
      expect(link).toEqual("#/dashboards/" + id);
      return [id, name];
    });
  }

  function addData () {
    uiConfig.data.dashboards = [
      { id: "dashboard1", name: "Dashboard One", widgets: [] },
      { id: "dashboard2", name: "Dashboard Two", widgets: [] }
    ];
    f.$scope.$digest();
  }

  function verifyOriginal () {
    expect(dashboards()).toEqual([
      { id: "dashboard1", name: "Dashboard One", widgets: [] },
      { id: "dashboard2", name: "Dashboard Two", widgets: [] }
    ]);
    expect(extractDashboards()).toEqual([
      ["dashboard1", "Dashboard One"],
      ["dashboard2", "Dashboard Two"]
    ]);
  }

  function centerPoint (element) {
    if (typeof element == "string")
      element = f.container.find(element);

    var ofs = element.offset();
    if (!ofs)
      throw new Error("centerPoint: element is not visible");

    return {
      x: ofs.left + element.outerWidth() / 2,
      y: ofs.top + element.outerHeight() / 2
    };
  };

  function drag (fromEl, toEl, xofs, yofs) {
    if (typeof fromEl == "string")
      fromEl = f.container.find(fromEl);
    var p1 = centerPoint(fromEl), p2 = centerPoint(toEl);
    if (xofs) p2.x += xofs;
    if (yofs) p2.y += yofs;
    fromEl.simulate("mousedown", { clientX: p1.x, clientY: p1.y });
    f.$scope.$digest();
    fromEl.simulate("mousemove", { clientX: p2.x, clientY: p2.y });
    f.$scope.$digest();
    fromEl.simulate("mouseup", { clientX: p2.x, clientY: p2.y });
  }

  it("should list dashboards when they exist", () => {
    addData();
    expect(extractDashboards()).toEqual([
      ["dashboard1", "Dashboard One"],
      ["dashboard2", "Dashboard Two"]
    ]);
  });

  function addButton () {
    return f.container.find("button[name=add]");
  }

  function inputs (row) {
    return f.container.find("tr").eq(row).find("td input[type=text]");
  }

  function editButton (row) {
    return f.container.find("tr").eq(row).find("td button[name=edit]");
  }

  function cancelButton (row) {
    return f.container.find("tr").eq(row).find("td button[name=cancel]");
  }

  function saveButton (row) {
    return f.container.find("tr").eq(row).find("td button[type=submit]");
  }

  it("should allow to add dashboards", () => {
    expect(inputs(1)).not.toExist();

    f.click(addButton());
    expect(inputs(1)).toHaveLength(2);

    expect(inputs(1).eq(0).val()).toBe("");
    inputs(1).eq(0).val("Dashboard One").change();
    expect(inputs(1).eq(1).val()).toBe("dashboard1");

    f.click(saveButton(1));
    expect(inputs(1)).not.toExist();

    expect(dashboards()).toEqual([
      { id: "dashboard1", name: "Dashboard One", widgets: [] }
    ]);
    expect(extractDashboards()).toEqual([
      ["dashboard1", "Dashboard One"]
    ]);

    f.click(editButton(1));
    expect(inputs(1)).toHaveLength(2);
    expect(inputs(1).eq(0).val()).toBe("Dashboard One");
    expect(inputs(1).eq(1).val()).toBe("dashboard1");

    f.click(addButton());
    expect(inputs(2).eq(0).val()).toBe("");
    inputs(2).eq(0).val("Dashboard Two").change();
    expect(inputs(2).eq(1).val()).toBe("dashboard2");

    f.click(saveButton(1));
    f.click(saveButton(2));
    expect(inputs(1)).not.toExist();
    expect(inputs(2)).not.toExist();

    // added from scratch using the form here (no addData() call)
    verifyOriginal();
  });

  it("should allow to edit dashboards", () => {
    addData();

    f.click(editButton(1));
    expect(inputs(1).eq(0).val()).toBe("Dashboard One");
    inputs(1).eq(0).val("  Dashboard One/x  ").change(); // whitespace is stripped by angular
    expect(inputs(1).eq(1).val()).toBe("dashboard1");
    inputs(1).eq(1).val("  dashboard1x  ").change(); // whitespace is stripped by angular
    f.click(saveButton(1));

    expect(dashboards()).toEqual([
      { id: "dashboard1x", name: "Dashboard One/x", widgets: [] },
      { id: "dashboard2", name: "Dashboard Two", widgets: [] }
    ]);
    expect(extractDashboards()).toEqual([
      ["dashboard1x", "Dashboard One/x"],
      ["dashboard2", "Dashboard Two"]
    ]);
  });

  it("should allow to remove rows", () => {
    addData();
    f.click("tr:eq(1) button[name=delete]");

    expect(dashboards()).toEqual([
      { id: "dashboard2", name: "Dashboard Two", widgets: [] }
    ]);
    expect(extractDashboards()).toEqual([
      ["dashboard2", "Dashboard Two"]
    ]);
  });

  it("should allow to cancel edit", () => {
    addData();
    f.click(editButton(1));
    inputs(1).eq(0).val("Dashboard QQQ/x").change();
    inputs(1).eq(1).val("dashboard_q").change();
    f.click(cancelButton(1));
    verifyOriginal();

    f.click(addButton());
    expect(inputs(3).eq(0).val()).toBe("");
    inputs(3).eq(0).val("New Dashboard").change();
    expect(inputs(3).eq(1).val()).toBe("dashboard3");
    inputs(3).eq(1).val("newdashboard").change();
    f.click(cancelButton(3));

    verifyOriginal();
  });

  it("should allow to move elements around", () => {
    // angular-sortable-view does unpretty setTimeout
    jasmine.clock().install();
    addData();

    drag("tr:eq(1) td:eq(0)", "tr:eq(2) td:eq(0)", 0, 20);
    jasmine.clock().tick(1000);

    expect(dashboards()).toEqual([
      { id: "dashboard2", name: "Dashboard Two", widgets: [] },
      { id: "dashboard1", name: "Dashboard One", widgets: [] }
    ]);
    expect(extractDashboards()).toEqual([
      ["dashboard2", "Dashboard Two"],
      ["dashboard1", "Dashboard One"]
    ]);
  });

  it("should not allow empty dashboard names", () => {
    addData();
    f.click(editButton(1));
    inputs(1).eq(0).val("").change();
    f.click(saveButton(1));
    expect(f.container.find(".editable-error:visible")).toContainText("Empty dashboard name is not allowed");
    f.click(cancelButton(1));
    verifyOriginal();
  });

  it("should not allow empty dashboard ids", () => {
    addData();
    f.click(editButton(1));
    inputs(1).eq(1).val("").change();
    f.click(saveButton(1));
    expect(f.container.find(".editable-error:visible")).toContainText("Empty dashboard id is not allowed");
    f.click(cancelButton(1));
    verifyOriginal();
  });

  it("should not allow duplicate dashboard ids", () => {
    addData();
    ["dashboard2", "   dashboard2", "dashboard2   ", "   dashboard2  "].forEach(id => {
      f.click(editButton(1));
      inputs(1).eq(1).val(id).change();
      f.click(saveButton(1));
      expect(f.container.find(".editable-error:visible")).toContainText("Duplicate dashboard ids are not allowed");
      f.click(cancelButton(1));
      verifyOriginal();
    });
  });

  // TBD: (later) also, disallow orphaning widgets due to dashboard removal / id changes
  // TBD: (later) display dashboard contents
});
