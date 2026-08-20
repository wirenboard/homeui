import { linter, type Diagnostic } from '@codemirror/lint';
import type { Extension, Text } from '@codemirror/state';
import { ViewPlugin } from '@codemirror/view';
import { autorun } from 'mobx';
import type { LocalTsDiag, TsCheckDiag } from '../types';
import { lintRefresher } from './lint-refresh';
import type { ControllerVerdict } from './types';

// Renders the controller-side tsgo verdict (Editor.Check RPC) inline in
// the editor: squiggles at the reported lines, merged with the local
// language service's own lint entries. The tooltip is labeled with the
// source so the two checks stay distinguishable.

export function controllerDiagsToCm(
  doc: Text,
  diags: TsCheckDiag[],
  localDiags: LocalTsDiag[] = [],
  loadErrorLine: number | null = null,
): Diagnostic[] {
  // the local language service usually reports the same finding at the
  // same line; showing both doubles every squiggle. Keep only the
  // controller entries the editor does not already show (version/skew
  // differences - the controller's unique value). The controller carries
  // only the head line of chained messages while the local service
  // flattens the whole chain, so match by prefix, not equality.
  const localByLine = new Map<number, string[]>();
  for (const l of localDiags) {
    localByLine.set(l.line, [...(localByLine.get(l.line) ?? []), l.message]);
  }
  const result: Diagnostic[] = [];
  for (const d of diags) {
    if (d.file) continue; // belongs to another file; cannot anchor here
    if (d.line < 1 || d.line > doc.lines) continue;
    if ((localByLine.get(d.line) ?? []).some((m) => m.startsWith(d.message))) continue;
    // a .ts file that failed to transpile has its syntax error reported
    // twice by the controller: as the load error of the save (already a
    // diagnostic at that line, see load-error.ts) and as the check verdict
    // (a grammar code TS1xxx, or no code at all for the transpile failure)
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

// The verdict describes the last-saved file. Once the user edits, its
// line anchors and findings go stale - a fixed line must not keep its
// old squiggle - so diagnostics render only while the document still
// matches the checked content (the local language service covers the
// live state; saving triggers a fresh verdict).
export function controllerDiagsForDoc(
  doc: Text,
  verdict: ControllerVerdict,
  localDiags: LocalTsDiag[] = [],
  loadErrorLine: number | null = null,
): Diagnostic[] {
  // CodeMirror normalizes line endings on ingest while checkedContent is
  // the raw stored file - a CRLF file must not permanently fail the match
  // and silently disable the verdict
  if (verdict.checkedContent === null
    || verdict.checkedContent.replace(/\r\n/g, '\n') !== doc.toString()) {
    return [];
  }
  return controllerDiagsToCm(doc, verdict.diags, localDiags, loadErrorLine);
}

// getVerdict must be a mobx-observable read; new RPC data re-triggers
// linting through the autorun below.
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
        // a verdict usually lands after the initial pass and before the user
        // types: queue a fresh pass (see lint-refresh.ts), off the current
        // update cycle
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
