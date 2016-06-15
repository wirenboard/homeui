"use strict";

describe("Room view", () => {
  var f, data;

  beforeEach(module("homeuiApp.fakeUIConfig"));
  beforeEach(module("homeuiApp.mqttViewFixture"));

  beforeEach(inject((MqttViewFixture, uiConfig) => {
    f = new MqttViewFixture("views/room.html", "RoomCtrl", {
      $routeParams: {
        id: "room1"
      }
    });
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
    data = uiConfig.data;
    data.rooms = [
      {
        id: "room1",
        name: "Room One",
        widgets: [
          {
            name: "Some widget",
            compact: true,
            cells: [
              { id: "dev1/temp1" },
              { id: "dev1/voltage1" }
            ]
          },
          {
            name: "Another widget",
            compact: false,
            cells: [
              { id: "dev2/baz", name: "Baz" }
            ]
          }
        ]
      },
      { id: "room2", name: "Room Two", widgets: [] }
    ];
    f.$rootScope.$digest();
  }));

  afterEach(() => {
    $(".ui-select-container").remove();
    f.remove();
  });

  it("should display room name in the header", () => {
    expect(f.container.find(".page-header")).toContainText("Room One");
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
    f.container.find(".ui-select-match .ui-select-toggle").click();
    $(".ui-select-container a.ui-select-choices-row-inner:contains(baz)").click();
    expect(f.container.find("button[type=submit]:visible")).not.toBeDisabled();
    f.click("button[type=submit]:visible");

    expect(angular.copy(data.rooms)).toEqual([
      {
        id: "room1",
        name: "Room One",
        widgets: [
          {
            name: "Some widget",
            compact: true,
            cells: [
              { id: "dev1/temp1" },
              { id: "dev1/voltage1" }
            ]
          },
          {
            name: "Another widget",
            compact: false,
            cells: [
              { id: "dev2/baz", name: "Baz" }
            ]
          },
          {
            name: "abc",
            compact: true,
            cells: [
              { id: "dev2/baz" }
            ]
          }
        ]
      },
      { id: "room2", name: "Room Two", widgets: [] }
    ]);
  });

  // TBD: scroll the new widget into view
  // TBD: skip 'new' items when saving the config
});
