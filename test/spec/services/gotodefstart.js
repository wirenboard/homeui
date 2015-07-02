"use strict";

describe("gotoDefStart service", function () {
  var gotoDefStart, textarea, cm,
      text =
        '// whatever\n' +
        'defineRule("abc", {\n' +
        '  when: function () { return !!dev.abc.def; },\n' +
        '  then: function () {\n' +
        '    log("foobar");\n' +
        '  }\n' +
        '});\n' +
        'if (true)\n' +
        '  defineRule("def", {\n' +
        '    when: function () { return !!dev.def.def; },\n' +
        '    then: function () {\n' +
        '      log("foobar");\n' +
        '    }\n' +
        '  });\n';
  beforeEach(module('homeuiApp'));

  beforeEach(inject(function (_gotoDefStart_) {
    gotoDefStart = _gotoDefStart_;
    textarea = $("<textarea>").appendTo(document.body).get(0);
    cm = CodeMirror(textarea, { mode: "javascript" });
    cm.setValue(text);
    expect(cm.lineCount()).toBe(15);
  }));

  afterEach(function () {
    $(textarea).remove();
  });

  it("should go back to the start of the definition", function () {
    cm.setCursor(6, 2);
    expect(cm.getTokenAt(cm.getCursor()).string).toBe(")");
    gotoDefStart(cm);
    var cur = cm.getCursor();
    expect(cur.line).toBe(1);
    expect(cur.ch).toBe(0);
  });

  it("should work even if the cursor is after the semicolon", function () {
    cm.setCursor(6, 3);
    gotoDefStart(cm);
    var cur = cm.getCursor();
    expect(cur.line).toBe(1);
    expect(cur.ch).toBe(0);
  });

  it("should work even if the cursor is at the start of line", function () {
    cm.setCursor(6, 0);
    gotoDefStart(cm);
    var cur = cm.getCursor();
    expect(cur.line).toBe(1);
    expect(cur.ch).toBe(0);
  });

  it("should match indented definitions properly", function () {
    cm.setCursor(13, 4);
    gotoDefStart(cm);
    var cur = cm.getCursor();
    expect(cur.line).toBe(8);
    expect(cur.ch).toBe(2);
  });
});
