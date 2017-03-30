import mqttDirectiveFixtureModule from '../services/mqttdirectivefixture';

describe("Directive: rgb-cell", () => {
  var f;

  beforeEach(angular.mock.module(mqttDirectiveFixtureModule));

  beforeEach(angular.mock.module($provide => {
    // make sure locally stored palette doesn't affect tests
    $provide.value("rgbLocalStorageKey", null);
  }));

  beforeEach(angular.mock.inject((MqttDirectiveFixture) => {
    f = new MqttDirectiveFixture("<rgb-cell cell=\"'dev2/fooRgb'\"></rgb-cell>");
    f.extClient.send("/devices/dev2/controls/fooRgb/meta/type", "rgb", true, 1);
    f.extClient.send("/devices/dev2/controls/fooRgb", "0;200;255", true, 0);
    f.$scope.$digest();
  }));

  afterEach(() => {
    $(".sp-container").remove();
    f.remove();
  });

  // XXX: this test depends upon the inner structure of spectrum controls

  function colorPreview () {
    return f.container.find(".cell.cell-rgb .sp-preview-inner:visible");
  }

  function extractColorFromPreview () {
    if (!colorPreview().length)
      throw new Error("color preview not found");
    return colorPreview().css("background-color").replace(/\s+/g, "");
  }

  function readOnlyColorIndicator () {
    return f.container.find(".cell.cell-rgb .color-indicator:visible");
  }

  function extractColorFromColorIndicator () {
    if (!readOnlyColorIndicator().length)
      throw new Error("color indicator not found");
    return readOnlyColorIndicator().css("background-color").replace(/\s+/g, "");
  }

  it("should display spectrum-colorpicker with cell color", () => {
    expect(colorPreview()).toExist();
    expect(extractColorFromPreview()).toEqual("rgb(0,200,255)");
  });

  it("should allow value editing for non-readonly cells", () => {
    colorPreview().click();
    expect($(".sp-palette:visible")).toHaveLength(1);
    expect($(".sp-thumb-inner:eq(0)").css("background-color").replace(/\s+/g, "")).toBe("rgb(255,255,255)");
    $(".sp-thumb-inner:eq(0)").click();
    f.$timeout.flush();
    f.expectJournal().toEqual([
      "ext: /devices/dev2/controls/fooRgb/on: [255;255;255] (QoS 1)"
    ]);
  });

  it("should display read-only cells as plain colored rectangles", () => {
    expect(readOnlyColorIndicator()).not.toExist();
    f.extClient.send("/devices/dev2/controls/fooRgb/meta/readonly", "1", true, 1);
    f.$scope.$digest();
    expect(colorPreview()).not.toExist();
    expect(extractColorFromColorIndicator()).toEqual("rgb(0,200,255)");
  });
});
