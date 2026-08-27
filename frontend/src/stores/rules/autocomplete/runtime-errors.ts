import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension, Text } from '@codemirror/state';
import { ViewPlugin } from '@codemirror/view';
import { comparer, reaction } from 'mobx';
import type { RuleRuntimeError } from '../types';
import { lintRefresher } from './lint-refresh';

// Runtime errors from the rule console (/wbrules/log/error) rendered inline at the
// line the engine attributes them to; parsing/recording lives in runtime-error-parse.ts.

// count and lastSeen deliberately stay out of the message: a rule failing every
// second would otherwise replace the diagnostic set (closing an open tooltip) every second
export function runtimeErrorsToCm(doc: Text, errors: RuleRuntimeError[]): Diagnostic[] {
  const result: Diagnostic[] = [];
  for (const e of errors) {
    if (e.line < 1 || e.line > doc.lines) continue;
    const line = doc.line(e.line);
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

// errors describe the file as it RUNS; once the user edits, anchors go stale, so
// render only while the document still matches the running content
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
  // an exception while loading is reported twice: as the save's load error (already
  // a diagnostic, see load-error.ts) and as a console error
  return runtimeErrorsToCm(doc, loadErrorLine === null ? errors : errors.filter((e) => e.line !== loadErrorLine));
}

// getErrors / getRunningContent must be mobx-observable reads. Re-linting replaces the
// whole diagnostic set (closing an open tooltip), so it runs only when the SET OF LINES
// with errors changes - never on a mere repeat (count/lastSeen/message) - and at most every 500 ms
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
