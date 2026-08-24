import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { loadTsEditorSupport } from './ts-language-service';

// The engine's built-in fs module (require("fs"), require("fs/promises") and
// the node: aliases): wb-rules.d.ts declares the modules and types require()
// of them through overloads ahead of the loose require(id: string): any. Rule
// files are transpiled to CommonJS with esModuleInterop, so a default import
// of the module works at runtime and the language service must accept it, as
// the engine's own check does.
describe('built-in fs module', () => {
  // wb-rules.d.ts types require("fs") / require("fs/promises") through
  // overloads declared ahead of the loose require(id: string): any, so the
  // engine's own module is checked while every other module name stays any
  it('types require("fs") and keeps other modules loose', async () => {
    const content = [
      'const fs = require("fs");',
      'fs.readFileSync(1);', // line 2: the path must be a string
      'fs.readFileSync("/etc/hostname");', // line 3: fine
      'const m = require("some-unknown.mod");', // line 4: unknown module -> any
      'm.anything(1);', // line 5: any flows freely
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('fs-require.ts', content);
    expect(support.getDiagnostics().map((d) => d.line)).toEqual([2]);
  }, 30000);

  it('accepts namespace and default imports of fs and exports (esModuleInterop, as in the engine check)', async () => {
    // the engine transpiles rule files to CommonJS with esModuleInterop, so a
    // default import of the built-in module works at runtime; the language
    // service mirrors the engine's --esModuleInterop, without which (on a
    // TypeScript whose defaults differ) TS1192 "has no default export" appears
    const content = [
      'import * as fs from "fs";',
      'import fsd from "fs";',
      'export const x = fsd.readFileSync("/x");',
      'export const y = fs.existsSync("/y");',
      '',
    ].join('\n');
    const support = await loadTsEditorSupport('fs-import.ts', content);
    expect(support.getDiagnostics()).toEqual([]);
  }, 30000);

  it('completes fs members after the dot', async () => {
    const content = 'const fs = require("fs");\nfs.';
    const support = await loadTsEditorSupport('fs-members.ts', content);
    const state = EditorState.create({ doc: content, extensions: support.extensions });
    const result = await support.completionSource(
      new CompletionContext(state, state.doc.length, false),
    );
    const labels = (result?.options ?? []).map((o) => o.label);
    expect(labels).toContain('readFileSync');
    expect(labels).toContain('promises');
  }, 30000);
});
