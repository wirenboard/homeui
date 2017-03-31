import dumbTemplateModule from '../../../app/scripts/services/dumbtemplate';

describe("Template engine", () => {
  var DumbTemplate;

  beforeEach(angular.mock.module(dumbTemplateModule));

  beforeEach(angular.mock.inject(_DumbTemplate_ => {
    DumbTemplate = _DumbTemplate_;
  }));

  it("should pass through plain strings", () => {
    var tmpl = DumbTemplate.compile("abc def foobar");
    expect(tmpl({})).toBe("abc def foobar");
  });

  it("should do simple var substitutions like {{ var }}", () => {
    var tmpl = DumbTemplate.compile("a={{a}} b={{b}} cdef={{ cdef }}; a again={{a}}");
    expect(tmpl({ a: 1, b: 42, cdef: "qqq" })).toBe("a=1 b=42 cdef=qqq; a again=1");
  });

  it("should understand dot in expressions", () => {
    var tmpl = DumbTemplate.compile("foo.bar={{ foo.bar }}");
    expect(tmpl({ foo: { bar: 42 } })).toBe("foo.bar=42");
  });

  it("should display null and undefined values as empty and not try to access members of undefined objects", () => {
    var tmpl = DumbTemplate.compile("undef={{ u }} a.b.c={{ a.b.c }}");
    expect(tmpl({})).toBe("undef= a.b.c=");
    expect(tmpl({ u: null })).toBe("undef= a.b.c=");
    expect(tmpl({ u: undefined })).toBe("undef= a.b.c=");
  });

  it("should support prefix strings", () => {
    var tmpl = DumbTemplate.compile("undef={{ (prefix)|u}} a={{ (prefix1)|a}}");
    expect(tmpl({ a: 42 })).toBe("undef= a= (prefix1)42");
  });

  it("should support suffix strings", () => {
    var tmpl = DumbTemplate.compile("undef={{u|(suffix) }} a={{a| (suffix1) }}");
    expect(tmpl({ a: 42 })).toBe("undef= a=42 (suffix1) ");
  });

  it("should support prefix+suffix simultaneous usage", () => {
    var tmpl = DumbTemplate.compile("undef={{ (prefix)| u |(suffix) }} a={{ (prefix1)| a | (suffix1) }}");
    expect(tmpl({ a: 42 })).toBe("undef= a= (prefix1)42 (suffix1) ");
  });

  it("should not display prefixes for empty strings", () => {
    var tmpl = DumbTemplate.compile("emp={{ (prefix)| emp |(suffix) }} a={{ (prefix1)| a | (suffix1) }}");
    expect(tmpl({ emp: "", a: 42 })).toBe("emp= a= (prefix1)42 (suffix1) ");
  });

  it("should not include neighboring expressions in prefixes / suffixes", () => {
    var tmpl = DumbTemplate.compile("{{a}} {{(|b|)}} {{c}}");
    expect(tmpl({ a: 42, b: 43, c: 44 })).toBe("42 (43) 44");
  });

  it("should understand arrays of objects, using key 'id' for matching", () => {
    var tmpl = DumbTemplate.compile("{{arr.x.a}}");
    expect(tmpl({ arr: [{id: "x", a: 42}, {id: "y", a: "bad" }]})).toBe("42");
  });

  it("should return empty string if array item with given 'id' not found", () => {
    var tmpl = DumbTemplate.compile("{{arr.[key]}}");
    expect(tmpl({ arr: [{id: "a", val: 42}], key: "a"})).toBe("[object Object]");
    expect(tmpl({ arr: [{id: "b", val: "bad"}]})).toBe("");
  });

  it("should understand indirect keys like {{ a.[b] }}", () => {
    var tmpl = DumbTemplate.compile("{{a.[b]}}");
    expect(tmpl({ a: { foo: 42 }, b: "foo" })).toBe("42");
  });
});
