import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension, Text } from '@codemirror/state';
import { ViewPlugin } from '@codemirror/view';
import { autorun } from 'mobx';
import { lintRefresher } from './lint-refresh';
import type { RuleLoadError } from './types';

// The load error of the open rule (the in-band error of Editor.Save /
// Editor.Load: a syntax error or an exception thrown while the file was
// being loaded), rendered as a diagnostic at the line the engine reported.
//
// It lives in the same lint gutter as the type-check and runtime
// diagnostics, so the editor has a single marker column; the full message
// stays in the banner above the editor, the line gets its first line.

// the first line of a load error: "SyntaxError: unexpected token" without
// the traceback the engine appends
export function loadErrorSummary(message: string): string {
  const nl = message.indexOf('\n');
  return (nl >= 0 ? message.slice(0, nl) : message).trim();
}

export function loadErrorToCm(
  doc: Text,
  error: RuleLoadError | null | undefined,
  // shown when the engine reported a line but an empty message; the page
  // passes a translated label
  fallbackMessage = 'load error',
): Diagnostic[] {
  const lineNo = error?.errorLine;
  if (!error || !lineNo || lineNo < 1 || lineNo > doc.lines) return [];
  const line = doc.line(lineNo);
  const indent = line.text.length - line.text.trimStart().length;
  return [{
    from: line.from + Math.min(indent, line.length),
    to: line.to,
    severity: 'error',
    source: 'load',
    message: loadErrorSummary(error.message) || fallbackMessage,
  }];
}

// getError must be a mobx-observable read (the rules store). The store
// clears errorLine as soon as the user edits, so the marker disappears with
// the first keystroke - the line anchor describes the file as it was saved.
// The refresh is deferred: the store update that clears the line runs inside
// the editor's own change transaction, where dispatching is not allowed.
export function loadErrorDiagnostics(
  getError: () => RuleLoadError | null | undefined,
  getFallbackMessage?: () => string,
): Extension {
  const refresher = lintRefresher();
  return [
    linter(
      (view) => loadErrorToCm(view.state.doc, getError(), getFallbackMessage?.()),
      { needsRefresh: refresher.needsRefresh },
    ),
    ViewPlugin.define((view) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let first = true;
      const stop = autorun(() => {
        const e = getError();
        void e?.errorLine;
        void e?.message;
        if (first) {
          first = false; // the linter's own initial run covers the mount
          return;
        }
        if (timer !== null) return;
        timer = setTimeout(() => {
          timer = null;
          refresher.refresh(view);
        }, 0);
      });
      return {
        destroy: () => {
          stop();
          if (timer !== null) clearTimeout(timer);
        },
      };
    }),
  ];
}
