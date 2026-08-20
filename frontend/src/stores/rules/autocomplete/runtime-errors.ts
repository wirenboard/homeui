import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension, Text } from '@codemirror/state';
import { ViewPlugin } from '@codemirror/view';
import { comparer, reaction } from 'mobx';
import type { RuleRuntimeError } from '../types';
import { lintRefresher } from './lint-refresh';

// Runtime errors from the rule debug console (/wbrules/log/error), rendered
// inline in the editor at the line the engine attributes them to. The rules
// store parses and records them (see runtime-error-parse.ts, kept free of
// CodeMirror imports so the store does not pull the editor into the app
// entry chunk); this module renders the recorded errors as lint entries.

// The diagnostic carries the error text only. The repeat count and the time
// of the last occurrence (kept in the store) deliberately stay out of it: a
// rule that fails every second would otherwise change the message - and so
// replace the whole diagnostic set, closing any open tooltip - every second.
export function runtimeErrorsToCm(doc: Text, errors: RuleRuntimeError[]): Diagnostic[] {
  const result: Diagnostic[] = [];
  for (const e of errors) {
    if (e.line < 1 || e.line > doc.lines) continue;
    const line = doc.line(e.line);
    // skip leading indentation so the squiggle starts at the statement
    const indent = line.text.length - line.text.trimStart().length;
    const from = line.from + Math.min(indent, line.length);
    result.push({
      from,
      to: line.to,
      severity: 'error',
      source: 'runtime',
      message: e.message,
    });
  }
  return result;
}

// Runtime errors describe the file as it RUNS on the controller. Once the
// user edits, line anchors go stale, so they render only while the document
// still matches the running content (what was loaded, or last saved). Saving
// reloads the file and clears its errors; new ones re-arrive if still real.
export function runtimeErrorsForDoc(
  doc: Text,
  errors: RuleRuntimeError[],
  runningContent: string | null,
  loadErrorLine: number | null = null,
): Diagnostic[] {
  if (runningContent === null
    || runningContent.replace(/\r\n/g, '\n') !== doc.toString()) {
    return [];
  }
  // an exception while the file loads is reported twice by the engine: as
  // the load error of the save (already a diagnostic at that line, see
  // load-error.ts) and as a console error with the same traceback
  return runtimeErrorsToCm(doc, loadErrorLine === null ? errors : errors.filter((e) => e.line !== loadErrorLine));
}

// getErrors / getRunningContent must be mobx-observable reads; new console
// messages re-trigger linting through the reaction below. Re-linting runs
// every lint source (including the TypeScript one) and replaces the whole
// diagnostic set, which closes an open tooltip - so it must happen only when
// the SET OF LINES with errors in THIS file changes (one added or cleared),
// never when an already-shown error merely repeats (count/lastSeen/message
// are not part of the key: a rule failing every second with the rejected
// value in its message would otherwise re-lint every second), never for
// another file's errors, and at most once per 500 ms.
export function runtimeErrorDiagnostics(
  getErrors: () => RuleRuntimeError[],
  getRunningContent: () => string | null,
  getLoadErrorLine?: () => number | null,
): Extension {
  const refresher = lintRefresher();
  return [
    linter(
      (view) => runtimeErrorsForDoc(
        view.state.doc, getErrors(), getRunningContent(), getLoadErrorLine?.() ?? null,
      ),
      { needsRefresh: refresher.needsRefresh },
    ),
    ViewPlugin.define((view) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const stop = reaction(
        () => [
          getErrors().map((e) => e.line).sort((a, b) => a - b).join(','),
          getRunningContent(),
          getLoadErrorLine?.() ?? null,
        ] as const,
        () => {
          if (timer !== null) return;
          timer = setTimeout(() => {
            timer = null;
            refresher.refresh(view);
          }, 500);
        },
        { equals: comparer.structural },
      );
      return {
        destroy: () => {
          stop();
          if (timer !== null) clearTimeout(timer);
        },
      };
    }),
  ];
}
