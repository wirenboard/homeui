"use strict";

describe("PageState service", () => {
  var $window, $rootScope, PageState, beforeUnloadHandler = null;

  beforeEach(() => {
    spyOn(window, "addEventListener").and.callFake((type, listener, useCapture) => {
      if (type != "beforeunload")
        return;
      if (beforeUnloadHandler !== null)
        throw new Error("multiple beforeunload handlers not supported by the test"); // FIXME
      beforeUnloadHandler = listener;
    });
  });
  beforeEach(module("homeuiApp"));
  beforeEach(module(function ($provide) {
    // for most tests, beforeUnload handler is disabled
    // because it interferes with unloading of the test frame
    $provide.value("forceBeforeUnloadConfirmationForTests", true);
  }));
  beforeEach(inject(function (_$window_, _$rootScope_, _PageState_) {
    $window = _$window_;
    $rootScope = _$rootScope_;
    PageState = _PageState_;
  }));

  afterEach(() => {
    beforeUnloadHandler = null;
  });

  it("should not be marked dirty initially", () => {
    expect(PageState.isDirty()).toBe(false);
  });

  it("should mark itself as dirty after setDirty(true) call", () => {
    PageState.setDirty(true);
    expect(PageState.isDirty()).toBe(true);
  });

  it("should mark itself clean after setDirty(false) call", () => {
    PageState.setDirty(true);
    expect(PageState.isDirty()).toBe(true);
    PageState.setDirty(false);
    expect(PageState.isDirty()).toBe(false);
  });

  it("should not ask for confirmation when leaving a non-dirty page", () => {
    spyOn($window, "confirm").and.throwError("must not ask for confirmation");
    var ev = $rootScope.$broadcast(
      "$locationChangeStart", "http://localhost/new", "http://localhost/old");
    expect(ev.defaultPrevented).toBeFalsy();
  });

  it("should ask for confirmation when leaving a dirty page", () => {
    var okToLeave = false;
    spyOn($window, "confirm").and.callFake((prompt) => {
      expect(typeof prompt).toBe("string");
      return okToLeave;
    });

    PageState.setDirty(true);

    var ev = $rootScope.$broadcast(
      "$locationChangeStart", "http://localhost/new", "http://localhost/old");
    expect(ev.defaultPrevented).toBeTruthy();
    expect(PageState.isDirty()).toBe(true);

    okToLeave = true;
    ev = $rootScope.$broadcast(
      "$locationChangeStart", "http://localhost/new", "http://localhost/old");
    expect(ev.defaultPrevented).toBeFalsy();
    expect(PageState.isDirty()).toBe(false);
  });

  it("should not ask for confirmation when closing a non-dirty tab", () => {
    expect(beforeUnloadHandler).toBeTruthy();
    expect(typeof beforeUnloadHandler).toBe("function");
    var e = {};
    expect(beforeUnloadHandler(e)).toBe(undefined);
    expect(e.hasOwnProperty("returnValue")).toBe(false);
  });

  it("should ask for confirmation when closing a dirty tab", () => {
    expect(beforeUnloadHandler).toBeTruthy();
    expect(typeof beforeUnloadHandler).toBe("function");
    PageState.setDirty(true);
    var e = {};
    expect(typeof beforeUnloadHandler(e)).toBe("string");
    expect(typeof e.returnValue).toBe("string");
  });
});
