"use strict";

describe("Directive: cell-picker", () => {
  var f;
  beforeEach(module("homeuiApp.mqttDirectiveFixture"));

  beforeEach(inject((MqttDirectiveFixture) => {
    f = new MqttDirectiveFixture(
      "<cell-picker placeholder='{{ placeholder}}' " +
        "ng-model='choice.cellId' filter-by-type='cellType'></cell-picker>");
    f.extClient.send("/devices/dev1/meta/name", "Dev1", true, 1);
    f.extClient.send("/devices/dev1/controls/foo/meta/type", "value", true, 1);
    f.extClient.send("/devices/dev1/controls/foo/meta/name", "Foo", true, 1);
    f.extClient.send("/devices/dev1/controls/foo", "42", true, 0);
    f.extClient.send("/devices/dev1/controls/bar/meta/type", "value", true, 1);
    // use strange cell name to test html escaping
    f.extClient.send("/devices/dev1/controls/bar/meta/name", "<Bar>", true, 1);
    f.extClient.send("/devices/dev1/controls/bar", "42", true, 0);
    f.extClient.send("/devices/dev2/controls/baz/meta/type", "text", true, 1);
    f.extClient.send("/devices/dev2/controls/baz", "qqq", true, 0);
    f.$scope.$digest();
  }));

  afterEach(() => {
    $(".ui-select-container").remove();
    f.remove();
  });

  it("should display currently selected cell in the picker", () => {
    f.$scope.choice = { cellId: "dev1/foo" };
    f.$scope.$digest();
    expect(".ui-select-match .ui-select-toggle").toContainText("Dev1 / Foo");
    expect(f.$scope.choice.cellId).toBe("dev1/foo");
  });

  it("should display cell list upon click", () => {
    // we don't use f.click() here because .ui-select-toggle is not
    // recognized as visible
    f.container.find(".ui-select-match .ui-select-toggle").click();
    // XXX: the following depends upon the inner structure of ui-select popup
    expect($(".ui-select-container a.ui-select-choices-row-inner").toArray().map(
      el => $(el).text().replace(/^\s+|\s+$/g, ""))).toEqual([
        "Dev1 / Foo",
        "Dev1 / <Bar>",
        "dev2 / baz"
      ]);
  });

  it("should select cell upon click", () => {
    f.container.find(".ui-select-match .ui-select-toggle").click();
    var el = $(".ui-select-container a.ui-select-choices-row-inner:contains(Bar)");
    expect(el).toExist();
    el.click();
    expect(f.$scope.choice.cellId).toBe("dev1/bar");
  });

  it("should support filtering by cell type", () => {
    f.$scope.cellType = "text";
    f.$scope.$digest();
    f.container.find(".ui-select-match .ui-select-toggle").click();
    // XXX: the following depends upon the inner structure of ui-select popup
    expect($(".ui-select-container a.ui-select-choices-row-inner").toArray().map(
      el => $(el).text().replace(/^\s+|\s+$/g, ""))).toEqual([
        "dev2 / baz"
      ]);
  });

  it("should support custom placeholders", () => {
    expect(f.container).toContainText("Select a control");
    f.$scope.placeholder = "Add a new control";
    f.$scope.$digest();
    expect(f.container).not.toContainText("Select a control");
    expect(f.container).toContainText("Add a new control");
  });
});
