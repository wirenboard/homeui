import mqttDirectiveFixtureModule from '../mock/mqttdirectivefixture';

describe("Directive: range-cell", () => {
  var f;

  beforeEach(angular.mock.module(mqttDirectiveFixtureModule));

  beforeEach(angular.mock.inject((MqttDirectiveFixture) => {
    f = new MqttDirectiveFixture("<range-cell cell=\"'dev2/bar'\"></range-cell>");
    f.extClient.send("/devices/dev2/controls/bar/meta/type", "range", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/min", "-1000", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/max", "1000", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/step", "1", true, 1);
    f.extClient.send("/devices/dev2/controls/bar/meta/units", "Unit", true, 1);
    f.extClient.send("/devices/dev2/controls/bar", "123", true, 0);
    f.$scope.$digest();
  }));

  afterEach(() => { f.remove(); });

  function input() {
    return f.container.find(".cell.cell-range input[type=range]:visible");
  }

  it("should display an input[type=range] reflecting the value of the cell", () => {
    expect(input()).toHaveLength(1);
    expect(input()).toBeVisible();
    expect(input()).toHaveValue("123");
  });

  it("it should apply min/max and step values to the slider", () => {
    expect(input().attr("min")).toBe("-1000");
    expect(input().attr("max")).toBe("1000");
    expect(input().attr("step")).toBe("1");
  });

  it("should display readonly cell values in readonly text field", () => {
    f.extClient.send("/devices/dev2/controls/bar/meta/readonly", "1", true, 1);
    f.$scope.$digest();
    expect(input()).toHaveValue("123");
    expect(input().prop("readonly")).toBe(true);
  });

  it("should allow value editing for non-readonly cells", () => {
    input().val("770").change();
    f.$timeout.flush();
    f.expectJournal().toEqual([
      "ext: /devices/dev2/controls/bar/on: [770] (QoS 1)"
    ]);
    expect(input()).toHaveValue("770");
  });

  it("should default min value to 0", () => {
    f.extClient.send("/devices/dev2/controls/bar/meta/min", "", true, 1);
    f.$rootScope.$digest();
    expect(input().attr("min")).toBe("0");
  });

  it("should display current cell value and units near the slider", () => {
    expect(f.container.find(".value")).toHaveText("123");
    expect(f.container.find(".units")).toHaveText("Unit");
  });
});
