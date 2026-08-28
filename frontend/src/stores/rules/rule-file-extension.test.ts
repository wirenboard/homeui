import { RULE_FILE_EXTENSION_RX, ruleFileExtension, TS_RULE_FILE_EXTENSION_RX } from './rule-file-extension';

// the explicit-format extensions the engine loads next to .js/.ts: .mjs/.mts
// (ES modules by name) and .cjs/.cts (classic scripts by name)
describe('rule file extensions', () => {
  it('recognises every rule file extension and nothing else', () => {
    for (const ok of ['a.js', 'a.ts', 'a.mjs', 'a.mts', 'a.cjs', 'a.cts', 'dir/x.mjs']) {
      expect(RULE_FILE_EXTENSION_RX.test(ok)).toBe(true);
    }
    for (const no of ['a.json', 'a.jsx', 'a.d', 'ajs', 'a.js.disabled']) {
      expect(RULE_FILE_EXTENSION_RX.test(no)).toBe(false);
    }
  });

  it('tells TypeScript files apart, module or classic', () => {
    expect(['a.ts', 'a.mts', 'a.cts'].every((n) => TS_RULE_FILE_EXTENSION_RX.test(n))).toBe(true);
    expect(['a.js', 'a.mjs', 'a.cjs', 'a.tsx'].some((n) => TS_RULE_FILE_EXTENSION_RX.test(n))).toBe(false);
  });

  it('keeps a file\'s own extension through rename/copy, defaulting to .js', () => {
    expect(ruleFileExtension('lights.mts')).toBe('.mts');
    expect(ruleFileExtension('legacy.cjs')).toBe('.cjs');
    expect(ruleFileExtension('plain')).toBe('.js');
  });
});
