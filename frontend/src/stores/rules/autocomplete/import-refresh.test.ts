// @vitest-environment happy-dom
import { linter } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { importRefreshPlugin } from './import-refresh';
import { lintRefresher } from './lint-refresh';

// The plugin that keeps imports typed while typing: after a document change
// (debounced) it asks refreshImports for the current text; when a module
// arrived it re-runs the lint pass from the outside (a lint source with the
// refresher's needsRefresh). It runs once on view creation too.

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(cond: () => boolean, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (cond()) return;
    await wait(25);
  }
  throw new Error('condition not met in time');
}

function makeView(
  refresh: (source: string) => Promise<boolean>,
  enabled: boolean,
  onLint: () => void,
) {
  const refresher = lintRefresher();
  return new EditorView({
    state: EditorState.create({
      doc: 'log(1);',
      extensions: [
        linter(() => {
          onLint();
          return [];
        }, { delay: 50, needsRefresh: refresher.needsRefresh }),
        importRefreshPlugin(refresh, refresher, enabled),
      ],
    }),
    parent: document.body,
  });
}

describe('importRefreshPlugin', () => {
  it('runs once on creation, then after a debounced edit, and re-lints only when a module arrived', async () => {
    const asked: string[] = [];
    let lints = 0;
    const view = makeView(async (src) => {
      asked.push(src);
      return src.includes('import');
    }, true, () => {
      lints++;
    });
    try {
      // creation: one refresh with the initial text, nothing arrived - the
      // lint pass count stays at the initial pass
      await until(() => asked.length === 1);
      expect(asked[0]).toBe('log(1);');
      await wait(300);
      const lintsAfterInit = lints;
      // typing: one debounced refresh for the final text, not one per keystroke
      view.dispatch({ changes: { from: 0, insert: 'import' } });
      await wait(100);
      view.dispatch({ changes: { from: 6, insert: ' "m";\n' } });
      await until(() => asked.length === 2);
      expect(asked[1]).toBe('import "m";\nlog(1);');
      // a module arrived: a lint pass runs without a further document change
      await until(() => lints > lintsAfterInit + 1);
    } finally {
      view.destroy();
    }
  });

  it('does nothing without a resolver (legacy firmware)', async () => {
    const refresh = vi.fn(async () => true);
    const view = makeView(refresh, false, () => {});
    try {
      view.dispatch({ changes: { from: 0, insert: 'import "m";' } });
      await wait(700);
      expect(refresh).not.toHaveBeenCalled();
    } finally {
      view.destroy();
    }
  });

  it('a refresh landing after the view is destroyed does not touch it', async () => {
    let settle: (v: boolean) => void = () => {};
    let lints = 0;
    const view = makeView(() => new Promise<boolean>((resolve) => {
      settle = resolve;
    }), true, () => {
      lints++;
    });
    await wait(600); // the creation refresh is in flight
    view.destroy();
    const lintsAtDestroy = lints;
    settle(true);
    await wait(300);
    expect(lints).toBe(lintsAtDestroy);
  });
});
