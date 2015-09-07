"use strict";

describe("Config view", function () {
  var f, vf, raf, reqId;

  beforeEach(module('homeuiApp'));
  beforeEach(module('homeuiApp.fakeMqtt'));
  beforeEach(module('homeuiApp.MqttRpc'));
  beforeEach(module('homeuiApp.viewFixture'));

  beforeEach(inject(function (FakeMqttFixture, ViewFixture) {
    reqId = 1;
    f = FakeMqttFixture;
    f.useJSON = true;
    f.connect();
    f.extClient.subscribe("/rpc/v1/confed/Editor/+/+", f.msgLogger("ext"));
    vf = ViewFixture;
    vf.compile("/views/config.html", "ConfigCtrl", {
      $routeParams: { path: "etc/foobar.conf" }
    });
    // json-editor is not very testable out of the box
    // because it uses RAF to postpone change events
    raf = window.requestAnimationFrame;
    window.requestAnimationFrame = function (callback) {
      callback();
    };
  }));

  afterEach(function () {
    window.requestAnimationFrame = raf;
    vf.remove();
  });

  function load () {
    f.expectJournal().toEqual([
      "ext: /rpc/v1/confed/Editor/Load/ui: [-] (QoS 1)",
      {
        id: reqId,
        params: {
          path: "/etc/foobar.conf"
        }
      }
    ]);
    f.extClient.send(
      "/rpc/v1/confed/Editor/Load/ui/reply",
      JSON.stringify({
        id: reqId++,
        result: {
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
        }
      }));
    f.$rootScope.$digest();
  }

  function nameInput () {
    var nameInput = vf.container.find("input[name='root[name]']");
    expect(nameInput).toExist();
    return nameInput;
  }

  it("should display the config using json-editor", function () {
    load();
    expect(nameInput().val()).toBe("foo");
  });

  function saveButton () {
    var saveBtn = vf.container.find(".config-editor > button[name=save]");
    expect(saveBtn).toHaveLength(1);
    return saveBtn;
  }

  it("should have Save button initially disabled", function () {
    load();
    expect(saveButton()).toBeDisabled();
  });

  function editName(newName) {
    var evt = document.createEvent("HTMLEvents");
    evt.initEvent("change", false, true);
    nameInput().val(newName).get(0).dispatchEvent(evt);
    f.$rootScope.$digest();
  }

  it("should enable Save button after changes are made", function () {
    load();
    editName("foobar");
    expect(saveButton()).not.toBeDisabled();
  });

  function processSave(expectedContent, error) {
    f.expectJournal().toEqual([
      "ext: /rpc/v1/confed/Editor/Save/ui: [-] (QoS 1)",
      {
        id: reqId,
        params: {
          path: "/etc/foobar.conf",
          content: expectedContent
        }
      }
    ]);
    f.extClient.send(
      "/rpc/v1/confed/Editor/Save/ui/reply",
      JSON.stringify(!error ? {
        id: reqId++,
        result: {
          path: "/etc/foobar.conf"
        }
      } : {
        id: reqId++,
        error: error
      }));
    f.$rootScope.$digest();
  }

  it("should post changes to the server after clicking Save, then disable Save button", function () {
    load();
    editName("foobar");
    saveButton().click();
    f.$rootScope.$digest();
    processSave({ name: "foobar" });
    expect(saveButton()).toBeDisabled();
  });

  it("should show validation errors and disable Save button when there are validation errors", function () {
    load();
    editName("");
    expect(saveButton()).toBeDisabled();
    var errorMsg = vf.container.find(".errormsg");
    expect(errorMsg).toHaveLength(1);
    expect(errorMsg).toBeVisible();
    expect(errorMsg).toContainText("Value required.");
  });

  it("should display an error and reenable Save button if save fails", function () {
    var msg = null;
    f.$rootScope.$on("alert", function (ev, message, sticky) {
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

// TBD: _format -> format (workaround for gojsconschema problem)
