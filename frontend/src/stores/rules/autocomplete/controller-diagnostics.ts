import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension, Text } from '@codemirror/state';
import { ViewPlugin } from '@codemirror/view';
import { autorun } from 'mobx';
import type { LocalTsDiag, TsCheckDiag } from '../types';
import { lintRefresher } from './lint-refresh';
import type { ControllerVerdict } from './types';

// Renders the controller-side tsgo verdict (Editor.Check) inline, next to the
// local language service's own entries.

export function controllerDiagsToCm(
  doc: Text,
  diags: TsCheckDiag[],
  localDiags: LocalTsDiag[] = [],
  loadErrorLine: number | null = null,
): Diagnostic[] {
  // keep only what the local service does not already show (version skew is the
  // controller's unique value); the controller carries only the head line of a
  // chained message, so match by prefix
  const localByLine = new Map<number, string[]>();
  for (const l of localDiags) {
    localByLine.set(l.line, [...(localByLine.get(l.line) ?? []), l.message]);
  }
  const result: Diagnostic[] = [];
  for (const d of diags) {
    if (d.file) continue; // belongs to another file; cannot anchor here
    if (d.line < 1 || d.line > doc.lines) continue;
    if ((localByLine.get(d.line) ?? []).some((m) => m.startsWith(d.message))) continue;
    // a syntax error is reported twice: as the save's load error (already a diagnostic
    // at that line, see load-error.ts) and in the verdict (grammar code TS1xxx or none)
    if (loadErrorLine !== null && d.line === loadErrorLine && d.severity === 'error'
      && (d.code === undefined || d.code < 2000)) continue;
    const line = doc.line(d.line);
    const from = line.from + Math.min(Math.max(d.column - 1, 0), line.length);
    result.push({
      from,
      to: line.to,
      severity: d.severity === 'error' ? 'error' : 'warning',
      source: 'controller (tsgo)',
      message: d.message,
    });
  }
  return result;
}

// the verdict describes the last-saved file; once the user edits its anchors go
// stale, so render only while the document still matches the checked content
export function controllerDiagsForDoc(
  doc: Text,
  verdict: ControllerVerdict,
  localDiags: LocalTsDiag[] = [],
  loadErrorLine: number | null = null,
): Diagnostic[] {
  // CodeMirror normalizes line endings on ingest; checkedContent is the raw stored file
  if (verdict.checkedContent === null
    || verdict.checkedContent.replace(/\r\n/g, '\n') !== doc.toString()) {
    return [];
  }
  return controllerDiagsToCm(doc, verdict.diags, localDiags, loadErrorLine);
}

// getVerdict must be a mobx-observable read; the autorun below re-triggers linting
export function controllerDiagnostics(
  getVerdict: () => ControllerVerdict,
  getLocalDiags?: () => LocalTsDiag[],
  getLoadErrorLine?: () => number | null,
): Extension {
  const refresher = lintRefresher();
  return [
    linter(
      (view) => controllerDiagsForDoc(
        view.state.doc, getVerdict(), getLocalDiags?.() ?? [], getLoadErrorLine?.() ?? null,
      ),
      { needsRefresh: refresher.needsRefresh },
    ),
    ViewPlugin.define((view) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let first = true;
      const stop = autorun(() => {
        const v = getVerdict();
        void v.diags;
        void v.checkedContent;
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
