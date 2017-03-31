"use strict";

describe("Config view", () => {
  var f, raf;

  beforeEach(module("homeuiApp.mqttRpcViewFixture"));

  beforeEach(inject(MqttRpcViewFixture => {
    f = new MqttRpcViewFixture("/rpc/v1/confed/Editor", "views/config.html", "ConfigCtrl", {
      $routeParams: { path: "usr/share/wb-mqtt-confed/schemas/foobar.schema.json" }
    });
    // json-editor is not very testable out of the box
    // because it uses RAF to postpone change events
    raf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      callback();
    };
  }));

  afterEach(() => {
    window.requestAnimationFrame = raf;
    f.remove();
  });

  function load () {
    f.expectRequest("/rpc/v1/confed/Editor/Load", {
      path: "/usr/share/wb-mqtt-confed/schemas/foobar.schema.json"
    }, {
      configPath: "/etc/foobar.conf",
      content: {
        name: "foo"
      },
      schema: {
        "type": "object",
        "title": "Another Example Config",
        "properties": {
          "name": {
            "type": "string",
            "title": "Device name",
            "description": "Device name to be displayed in UI",
            "minLength": 1
          }
        },
        "required": ["name"],
        "configPath": "/etc/foobar.conf"
      }
    });
  }

  function nameInput () {
    var nameInput = f.container.find("input[name='root[name]']");
    expect(nameInput).toExist();
    return nameInput;
  }

  it("should display the config using json-editor", () => {
    load();
    expect(nameInput().val()).toBe("foo");
  });

  function saveButton () {
    var saveBtn = f.container.find(".config-editor > button[name=save]");
    expect(saveBtn).toHaveLength(1);
    return saveBtn;
  }

  it("should have Save button initially disabled", () => {
    load();
    expect(saveButton()).toBeDisabled();
  });

  function editName (newName) {
    var evt = document.createEvent("HTMLEvents");
    evt.initEvent("change", false, true);
    nameInput().val(newName).get(0).dispatchEvent(evt);
    f.$rootScope.$digest();
  }

  it("should enable Save button after changes are made", () => {
    load();
    editName("foobar");
    expect(saveButton()).not.toBeDisabled();
  });

  function processSave (expectedContent, error) {
    var params = {
      path: "/usr/share/wb-mqtt-confed/schemas/foobar.schema.json",
      content: expectedContent
    };
    if (!error)
      f.expectRequest("/rpc/v1/confed/Editor/Save", params, {
        path: "/usr/share/wb-mqtt-confed/schemas/foobar.schema.json"
      });
    else
      f.expectRequestAndFail("/rpc/v1/confed/Editor/Save", params, error);
  }

  it("should post changes to the server after clicking Save, then disable Save button", () => {
    load();
    editName("foobar");
    saveButton().click();
    f.$rootScope.$digest();
    processSave({ name: "foobar" });
    expect(saveButton()).toBeDisabled();
  });

  it("should show validation errors and disable Save button when there are validation errors", () => {
    load();
    editName("");
    expect(saveButton()).toBeDisabled();
    var errorMsg = f.container.find(".errormsg");
    expect(errorMsg).toHaveLength(1);
    expect(errorMsg).toBeVisible();
    expect(errorMsg).toContainText("Value required.");
  });

  it("should display an error and reenable Save button if save fails", () => {
    var msg = null;
    f.$rootScope.$on("alert", (ev, message, sticky) => {
      expect(msg).toBeNull();
      expect(sticky).toBe(true);
      msg = message;
    });
    load();
    editName("foobar");
    saveButton().click();
    expect(msg).toBeNull();
    processSave({ name: "foobar" }, {
      code: -1,
      message: "write failed"
    });
    expect(saveButton()).not.toBeDisabled();
    expect(msg).toBe("Error saving /etc/foobar.conf: write failed");
  });
});
