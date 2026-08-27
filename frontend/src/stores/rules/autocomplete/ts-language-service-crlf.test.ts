import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { loadTsEditorSupport } from './ts-language-service';

// Editor.Load hands over the raw stored file; a CRLF file must be LF-normalized at
// seed time or every editor position after line 1 drifts (CodeMirror positions are LF-based)
describe('CRLF rule files', () => {
  it('normalizes line endings at seed time so positions match the editor doc', async () => {
    const crlf = 'const s = "x";\r\n\r\n\r\n\r\n\r\nconst t = s.charAt(0);\r\n';
    const support = await loadTsEditorSupport('crlf.ts', crlf);
    const state = EditorState.create({ doc: crlf, extensions: support.extensions });
    const pos = state.doc.toString().indexOf('s.charAt') + 2; // right after the dot
    const result = await support.completionSource(new CompletionContext(state, pos, false));
    const labels = (result?.options ?? []).map((o) => o.label);
    expect(labels).toContain('charAt');
    expect(support.getDiagnostics()).toEqual([]);
    // 30s: the first build pays the language-service cold start
  }, 30000);

  it('normalizes on reseed too', async () => {
    const support = await loadTsEditorSupport('crlf-reseed.ts', 'const n: number = 1;\n');
    support.reseed('const a = 1;\r\nconst n: number = "x";\r\n');
    const diags = support.getDiagnostics();
    expect(diags).toHaveLength(1);
    expect(diags[0].line).toBe(2);
  }, 30000);
});
