import { forceLinting } from '@codemirror/lint';
import { StateEffect } from '@codemirror/state';
import type { LintRefresher } from './types';

// Re-runs the lint sources from an OUTSIDE event (a store update, an RPC reply).
// forceLinting() only runs an already-queued pass, and only a document change queues
// one; dispatching a private effect that needsRefresh recognizes queues it first.
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
