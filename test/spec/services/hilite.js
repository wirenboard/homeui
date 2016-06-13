"use strict";

describe("Filter: hilite", () => {
  var filt;

  beforeEach(module("homeuiApp"));
  beforeEach(inject($filter => { filt = $filter("hilite"); }));

  it("should highlight a matching part of the string, if any", () => {
    [
      ["", "", ""],
      ["", "aaaa", "aaaa"],
      ["", "aaaa<x>", "aaaa&lt;x&gt;"],
      ["abc", "", ""],
      ["abc", "abc", "<strong>abc</strong>"],
      ["abc", "Abc", "<strong>Abc</strong>"],
      ["abc", "ABC", "<strong>ABC</strong>"],
      ["abc", "abcdef", "<strong>abc</strong>def"],
      ["abc", "Abcdef", "<strong>Abc</strong>def"],
      ["abc", "Defabc", "Def<strong>abc</strong>"],
      ["abc", "qqqqqq", "qqqqqq"],
      ["abc", "qqqqqq<x>", "qqqqqq&lt;x&gt;"],
      ["abc", "qqqqqq<x>abcZZZZ<q>", "qqqqqq&lt;x&gt;<strong>abc</strong>ZZZZ&lt;q&gt;"],
      ["abc", "qqqqqq<x>abcZZZZ<q>abc", "qqqqqq&lt;x&gt;<strong>abc</strong>ZZZZ&lt;q&gt;<strong>abc</strong>"],
      [
        "abc<b>",
        "qqqqqq<x>ABC<b>ZZZZ<q>Abc<b>",
        "qqqqqq&lt;x&gt;<strong>ABC&lt;b&gt;</strong>ZZZZ&lt;q&gt;<strong>Abc&lt;b&gt;</strong>"
      ]
    ].forEach(item => {
      expect(filt(item[1], item[0])).toEqual(item[2]);
    });
  });
});
