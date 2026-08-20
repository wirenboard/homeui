// @vitest-environment happy-dom
// index.ts imports the devices store (via enums.ts), whose module graph
// (i18n, auth) reads localStorage/window at import time; happy-dom provides
// them.
import { CompletionContext, type CompletionSource } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { mergeSources } from './index';

const contextAtEnd = (doc: string) =>
  new CompletionContext(EditorState.create({ doc }), doc.length, false);

describe('mergeSources', () => {
  // a context-specific source that matched the position but has nothing to
  // offer: its result anchors at the 2-char word before the cursor
  const emptyContextSource: CompletionSource = (context) => ({ from: context.pos - 2, options: [] });
  const globalsSource: CompletionSource = (context) => ({
    from: context.pos,
    options: [{ label: 'defineRule' }],
  });

  it('lets later sources answer when an earlier one matched with no completions', async () => {
    const merged = mergeSources([emptyContextSource, globalsSource]);
    const result = await merged(contextAtEnd('dev[bu'));
    expect(result?.options.map((o) => o.label)).toEqual(['defineRule']);
  });

  it('does not fall through to global sources inside a string literal', async () => {
    const merged = mergeSources([emptyContextSource, globalsSource]);
    // a control reference with no matches keeps its empty popup: global
    // identifiers/snippets are never the answer inside "..."
    for (const doc of ['getControl("bu', 'vdev.getControl(\'bu']) {
      const result = await merged(contextAtEnd(doc));
      expect(result).not.toBeNull();
      expect(result?.options).toEqual([]);
    }
  });

  it('still returns null when no source matches', async () => {
    const merged = mergeSources([() => null]);
    expect(await merged(contextAtEnd('x'))).toBeNull();
  });
});
