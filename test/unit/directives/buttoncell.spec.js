import mqttDirectiveFixtureModule from '../mock/mqttdirectivefixture';

describe("Directive: button-cell", () => {
  var f;
  beforeEach(angular.mock.module(mqttDirectiveFixtureModule));

  beforeEach(angular.mock.inject((MqttDirectiveFixture) => {
    f = new MqttDirectiveFixture("<button-cell cell=\"'dev2/fooButton'\"></button-cell>");
    f.extClient.send("/devices/dev2/controls/fooButton/meta/name", "Foo Button", true, 1);
    f.extClient.send("/devices/dev2/controls/fooButton/meta/type", "pushbutton", true, 1);
    f.$scope.$digest();
  }));

  afterEach(() => { f.remove(); });

  function button () {
    return f.container.find("button.cell.cell-button:visible");
  }

  it("should display a button with the cell name on it", () => {
    expect(button()).toExist();
    expect(button()).toContainText("Foo Button");
  });

  it("should handle button clicks", () => {
    button().click();
    f.expectJournal().toEqual([
      "ext: /devices/dev2/controls/fooButton/on: [1] (QoS 1)"
    ]);
  });

  it("should disable the button when the cell is read-only", () => {
    expect(button()).not.toBeDisabled();
    f.extClient.send("/devices/dev2/controls/fooButton/meta/readonly", "1", true, 1);
    f.$scope.$digest();
    expect(button()).toBeDisabled();
  });
});
