// @vitest-environment happy-dom
// happy-dom: the devices store's module graph reads localStorage/window at import time
import { CompletionContext, type CompletionSource } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { mergeSources } from './index';

const contextAtEnd = (doc: string) =>
  new CompletionContext(EditorState.create({ doc }), doc.length, false);

describe('mergeSources', () => {
  // matched the position but has nothing to offer
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
