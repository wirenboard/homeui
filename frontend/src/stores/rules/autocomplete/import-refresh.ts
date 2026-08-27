import { ViewPlugin, type EditorView } from '@codemirror/view';
import type { LintRefresher } from './types';

// Imports typed while you type. A specifier added in the editor is fetched
// from the controller (debounced) and the module dropped into the language
// service's environment by `refreshImports`; the lint pass is then re-run
// from the outside (see lint-refresh.ts), since the fetch completes after
// the keystroke's own pass. The same runs once when a view opens on a
// reused environment, so a rule reopened with new imports on disk catches
// up. `enabled` is false without a resolver (legacy firmware): the plugin
// then does nothing.
export function importRefreshPlugin(
  refreshImports: (source: string) => Promise<boolean>,
  refresher: LintRefresher,
  enabled: boolean,
) {
  return ViewPlugin.define((view: EditorView) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    const run = () => {
      timer = null;
      refreshImports(view.state.doc.toString()).then(
        (changed) => {
          // never synchronously inside an update; and not after the view is
          // gone (the page navigated away while the RPC was in flight)
          if (changed && !disposed) setTimeout(() => !disposed && refresher.refresh(view), 0);
        },
        () => {},
      );
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, 400);
    };
    if (enabled) schedule();
    return {
      update: (update) => {
        if (update.docChanged && enabled) schedule();
      },
      destroy: () => {
        disposed = true;
        if (timer) clearTimeout(timer);
      },
    };
  });
}
