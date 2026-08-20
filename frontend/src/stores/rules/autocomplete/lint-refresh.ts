import { forceLinting } from '@codemirror/lint';
import { StateEffect } from '@codemirror/state';
import type { LintRefresher } from './types';

// Re-running the editor's lint sources from an OUTSIDE event (a store
// update, an RPC reply, a console message) - not a document edit.
//
// @codemirror/lint's forceLinting() only runs a lint pass that is already
// queued, and a pass is queued only by a document change (or by the linter's
// needsRefresh predicate returning true for a transaction). So a plain
// forceLinting() after a store change is a no-op whenever the user has not
// typed since the last pass - the new diagnostics would sit unseen until the
// next keystroke. The refresher pairs a private StateEffect with a
// needsRefresh that recognizes it: dispatching the effect queues a pass,
// forceLinting then runs it immediately.
export function lintRefresher(): LintRefresher {
  const effect = StateEffect.define<null>();
  return {
    needsRefresh: (update) => update.transactions.some((tr) => tr.effects.some((e) => e.is(effect))),
    refresh: (view) => {
      view.dispatch({ effects: effect.of(null) });
      forceLinting(view);
    },
  };
}
