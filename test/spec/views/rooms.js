"use strict";

describe("Rooms view", function () {
  var f, data;

  beforeEach(module("homeuiApp.fakeUIConfig"));
  beforeEach(module("homeuiApp.viewFixture"));

  beforeEach(inject(function (ViewFixture, uiConfig) {
    f = ViewFixture;
    f.setup("views/rooms.html", "RoomsCtrl");
    data = uiConfig.data;
  }));

  afterEach(function () {
    f.remove();
  });

  it("should not display any rooms when there's no rooms defined", function () {
    expect("table").not.toExist();
    expect(".empty-list").toExist();
  });

  function extractRooms() {
    return f.container.find("table > tbody > tr.room:visible").toArray().map(function (tr) {
      var name = $(tr).find("td").eq(0).text(),
          id = $(tr).find("td").eq(1).text(),
          link = $(tr).find("td:eq(2) a").prop("hash");
      expect(link).toEqual("#/rooms/" + id);
      return [id, name];
    });
  }

  function addData() {
    data.rooms = [
      { id: "room1", name: "Room One" },
      { id: "room2", name: "Room Two" }
    ];
    f.$scope.$digest();
  }

  function verifyOriginal() {
    expect(angular.copy(data.rooms)).toEqual([
      { id: "room1", name: "Room One" },
      { id: "room2", name: "Room Two" }
    ]);
    expect(extractRooms()).toEqual([
      ["room1", "Room One"],
      ["room2", "Room Two"]
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

  function drag(fromEl, toEl, xofs, yofs) {
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

  it("should list rooms when they exist", function () {
    addData();
    expect(extractRooms()).toEqual([
      ["room1", "Room One"],
      ["room2", "Room Two"]
    ]);
  });

  function addBtn() {
    return f.container.find("button[name=add]");
  }

  function editBtn() {
    return f.container.find("button[name=edit-rooms]");
  }

  function inputs (row) {
    return f.container.find("tr").eq(row).find("td input[type=text]");
  }

  it("should be possible to add rooms", function () {
    expect(inputs(1)).not.toExist();
    expect(addBtn()).not.toBeVisible();

    f.click(editBtn());
    expect(editBtn()).not.toBeVisible();

    f.click(addBtn());
    expect(inputs(1)).toHaveLength(2);

    expect(inputs(1).eq(0).val()).toBe("");
    inputs(1).eq(0).val("Room One").change();
    expect(inputs(1).eq(1).val()).toBe("");
    inputs(1).eq(1).val("room1").change();

    f.click("button[type=submit]");
    expect(inputs(1)).not.toExist();
    expect(addBtn()).not.toBeVisible();

    // angular.copy() removes $$hashKey properties
    expect(angular.copy(data.rooms)).toEqual([
      { id: "room1", name: "Room One" }
    ]);
    expect(extractRooms()).toEqual([
      ["room1", "Room One"]
    ]);

    f.click(editBtn());
    expect(editBtn()).not.toBeVisible();

    expect(inputs(1)).toHaveLength(2);
    expect(inputs(1).eq(0).val()).toBe("Room One");
    expect(inputs(1).eq(1).val()).toBe("room1");

    f.click(addBtn());
    expect(inputs(2).eq(0).val()).toBe("");
    inputs(2).eq(0).val("Room Two").change();
    expect(inputs(2).eq(1).val()).toBe("");
    inputs(2).eq(1).val("room2").change();

    f.click("button[type=submit]");
    expect(inputs(1)).not.toExist();
    expect(inputs(2)).not.toExist();
    expect(addBtn()).not.toBeVisible();

    verifyOriginal();
  });

  it("should be possible to edit rooms", function () {
    addData();
    f.click(editBtn());

    expect(inputs(1).eq(0).val()).toBe("Room One");
    inputs(1).eq(0).val("  Room One/x  ").change(); // whitespace is stripped by angular
    expect(inputs(1).eq(1).val()).toBe("room1");
    inputs(1).eq(1).val("  room1x  ").change(); // whitespace is stripped by angular
    f.click("button[type=submit]");

    expect(angular.copy(data.rooms)).toEqual([
      { id: "room1x", name: "Room One/x" },
      { id: "room2", name: "Room Two" }
    ]);
    expect(extractRooms()).toEqual([
      ["room1x", "Room One/x"],
      ["room2", "Room Two"]
    ]);
  });

  it("should be possible to remove rows", function () {
    addData();
    f.click(editBtn());
    f.click("tr:eq(1) button[name=delete]");
    f.click("button[type=submit]");

    expect(angular.copy(data.rooms)).toEqual([
      { id: "room2", name: "Room Two" }
    ]);
    expect(extractRooms()).toEqual([
      ["room2", "Room Two"]
    ]);
  });

  it("should be possible to cancel edit", function () {
    addData();
    f.click(editBtn());
    f.click("tr:eq(1) button[name=delete]");
    inputs(1).eq(0).val("Room Two/x").change();
    inputs(1).eq(1).val("room2x").change();
    f.click(addBtn());
    expect(inputs(2).eq(0).val()).toBe("");
    inputs(2).eq(0).val("New Room").change();
    expect(inputs(2).eq(1).val()).toBe("");
    inputs(2).eq(1).val("newroom").change();
    f.click("button[name=cancel]");

    verifyOriginal();
  });

  it("should be possible to move elements around", function () {
    // angular-sortable-view does unpretty setTimeout
    jasmine.clock().install();
    addData();
    f.click(editBtn()); // as of now, not really needed

    drag("tr:eq(1) td:eq(0)", "tr:eq(2) td:eq(0)", 0, 20);
    jasmine.clock().tick(1000);

    expect(angular.copy(data.rooms)).toEqual([
      { id: "room2", name: "Room Two" },
      { id: "room1", name: "Room One" }
    ]);
    expect(extractRooms()).toEqual([
      ["room2", "Room Two"],
      ["room1", "Room One"]
    ]);
  });

  it("should not allow empty room names", function () {
    addData();
    f.click(editBtn());
    inputs(1).eq(0).val("").change();
    f.click("button[type=submit]");
    expect(f.container.find(".editable-error:visible")).toContainText("Empty room name is not allowed");
    f.click("button[name=cancel]");
    verifyOriginal();
  });

  it("should not allow empty room ids", function () {
    addData();
    f.click(editBtn());
    inputs(1).eq(1).val("").change();
    f.click("button[type=submit]");
    expect(f.container.find(".editable-error:visible")).toContainText("Empty room id is not allowed");
    f.click("button[name=cancel]");
    verifyOriginal();
  });

  it("should not allow duplicate room ids", function () {
    addData();
    ["room2", "   room2", "room2   ", "   room2  "].forEach(function (id) {
      f.click(editBtn());
      inputs(1).eq(1).val(id).change();
      f.click("button[type=submit]");
      expect(f.container.find(".editable-error:visible")).toContainText("Duplicate room ids are not allowed");
      f.click("button[name=cancel]");
      verifyOriginal();
    });
  });

  // TBD: (later) rm old room js/html/css
  // TBD: (later) also, disallow orphaning widgets due to room removal / id changes
  // TBD: (later) display room contents
});
