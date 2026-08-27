// @vitest-environment happy-dom
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tsDiagnosticsLinter, tsDiagnosticsSource, tsSeverity } from './ts-diagnostics-linter';

// a chained TypeScript message must keep the part that names the offending property
describe('tsDiagnosticsLinter', () => {
  it('renders the whole message chain, one line per link', async () => {
    const ts = (await import('typescript')).default;
    const vfs = await import('@typescript/vfs');
    // lib.d.ts is needed for the checker to resolve even the primitives
    const fsMap = await vfs.createDefaultMapFromNodeModules({ target: ts.ScriptTarget.ES2020 }, ts);
    const path = 'chain.ts';
    const content = [
      'type Spec = { type: "rgb" };',
      'const cells = { type: "value" };',
      'const spec: Spec = cells;',
      '',
    ].join('\n');
    fsMap.set(path, content);
    const system = vfs.createSystem(fsMap);
    const env = vfs.createVirtualTypeScriptEnvironment(system, [path], ts, { strict: false });
    const view = new EditorView({
      state: EditorState.create({ doc: content, extensions: [tsDiagnosticsLinter(ts, env, path)] }),
    });
    const diags = await tsDiagnosticsSource(ts, env, path)(view);
    view.destroy();
    expect(diags).toHaveLength(1);
    const [d] = diags;
    expect(d.severity).toBe('error');
    expect(d.source).toBe('typescript');
    const lines = d.message.split('\n');
    expect(lines[0]).toMatch(/is not assignable to type 'Spec'/);
    expect(lines.length).toBeGreaterThan(1);
    expect(d.message).toMatch(/Types of property 'type' are incompatible/); // the explaining link is there
    expect(content.slice(d.from, d.to)).toBe('spec');
    // 30s: the language-service cold start exceeds the 5s default on CI
  }, 30000);

  it('maps categories like the linter it replaces', async () => {
    const ts = (await import('typescript')).default;
    const mk = (category: number, code = 1): Parameters<typeof tsSeverity>[1] =>
      ({ category, code, messageText: '', file: undefined, start: 0, length: 0 });
    expect(tsSeverity(ts, mk(ts.DiagnosticCategory.Error))).toBe('error');
    expect(tsSeverity(ts, mk(ts.DiagnosticCategory.Warning))).toBe('warning');
    expect(tsSeverity(ts, mk(ts.DiagnosticCategory.Message))).toBe('info');
    expect(tsSeverity(ts, mk(ts.DiagnosticCategory.Error, 7027))).toBe('warning');
  }, 30000);
});
