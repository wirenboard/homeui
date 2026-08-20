import {
  closeLintPanel,
  forEachDiagnostic,
  lintGutter,
  lintKeymap,
  openLintPanel,
  setDiagnosticsEffect,
  type Diagnostic,
} from '@codemirror/lint';
import { type Extension, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import type { DiagnosticCounts } from './types';

// Diagnostics that do not depend on hovering.
//
// A squiggle plus a hover tooltip is easy to miss and gone the moment the
// mouse moves. Three complementary, standard-CodeMirror pieces make every
// diagnostic (TypeScript errors, the controller verdict, forgot-await
// warnings, runtime errors) stick:
//   1. an inline message after the offending line ("error lens"), colored
//      by severity, with the full text on hover;
//   2. lint gutter markers - a persistent icon per line with problems;
//   3. the Problems panel (F8 / Ctrl-Shift-M, or a badge in the page
//      header) listing everything with click-to-jump.
// The counter reports {errors, warnings, total} to the host so it can render
// the badge.

export type { DiagnosticCounts } from './types';

const SEVERITY_RANK: Record<string, number> = { error: 3, warning: 2, info: 1, hint: 0 };

function firstLine(text: string): string {
  const nl = text.indexOf('\n');
  return nl >= 0 ? text.slice(0, nl) : text;
}

class LensWidget extends WidgetType {
  constructor(readonly text: string, readonly severity: string, readonly full: string) {
    super();
  }

  eq(other: LensWidget) {
    return other.text === this.text && other.severity === this.severity && other.full === this.full;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = `cm-wb-lens cm-wb-lens-${this.severity}`;
    span.textContent = this.text;
    span.title = this.full;
    span.setAttribute('aria-hidden', 'true'); // the panel/tooltip carry the accessible copy
    return span;
  }

  ignoreEvent() {
    return true;
  }
}

// One lens per line: the worst severity, the first message (plus "+N" for
// the rest); every message in the hover title.
export function lensDecorations(view: EditorView): DecorationSet {
  const byLine = new Map<number, Diagnostic[]>();
  forEachDiagnostic(view.state, (d, from) => {
    const line = view.state.doc.lineAt(from).number;
    byLine.set(line, [...(byLine.get(line) ?? []), d]);
  });
  const builder = new RangeSetBuilder<Decoration>();
  for (const lineNo of [...byLine.keys()].sort((a, b) => a - b)) {
    const diags = byLine.get(lineNo)!;
    const worst = diags.reduce((acc, d) => (
      (SEVERITY_RANK[d.severity] ?? 0) > (SEVERITY_RANK[acc.severity] ?? 0) ? d : acc
    ), diags[0]);
    const more = diags.length > 1 ? `  (+${diags.length - 1})` : '';
    const line = view.state.doc.line(lineNo);
    builder.add(line.to, line.to, Decoration.widget({
      widget: new LensWidget(firstLine(worst.message) + more, worst.severity, diags.map((d) => d.message).join('\n')),
      side: 1,
    }));
  }
  return builder.finish();
}

function diagnosticsChanged(update: ViewUpdate): boolean {
  return update.transactions.some((tr) => tr.effects.some((e) => e.is(setDiagnosticsEffect)));
}

const lensPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = lensDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || diagnosticsChanged(update)) {
      this.decorations = lensDecorations(update.view);
    }
  }
}, { decorations: (v) => v.decorations });

const lensTheme = EditorView.baseTheme({
  '.cm-wb-lens': {
    display: 'inline-block',
    verticalAlign: 'bottom',
    maxWidth: 'min(70ch, 50vw)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginLeft: '1.5em',
    fontStyle: 'italic',
    fontSize: '90%',
    opacity: '0.85',
    whiteSpace: 'pre',
    userSelect: 'none',
  },
  '&light .cm-wb-lens-error': { color: '#c62828' },
  '&dark .cm-wb-lens-error': { color: '#ff7b72' },
  '&light .cm-wb-lens-warning': { color: '#8a6d00' },
  '&dark .cm-wb-lens-warning': { color: '#e3b341' },
  '.cm-wb-lens-info, .cm-wb-lens-hint': { color: '#8a8a8a' },
});

export function diagnosticsLens(): Extension {
  return [lensPlugin, lensTheme];
}

export function countDiagnostics(view: EditorView): DiagnosticCounts {
  const counts: DiagnosticCounts = { errors: 0, warnings: 0, total: 0 };
  forEachDiagnostic(view.state, (d) => {
    counts.total += 1;
    if (d.severity === 'error') counts.errors += 1;
    else if (d.severity === 'warning') counts.warnings += 1;
  });
  return counts;
}

// Reports the diagnostic counts to the host whenever they change (mount
// included), so it can show a "N problems" badge.
export function diagnosticsCounter(onChange: (counts: DiagnosticCounts) => void): Extension {
  return ViewPlugin.define((view) => {
    let last = countDiagnostics(view);
    onChange(last);
    return {
      update(update: ViewUpdate) {
        if (!diagnosticsChanged(update)) return;
        const next = countDiagnostics(update.view);
        if (next.errors !== last.errors || next.warnings !== last.warnings || next.total !== last.total) {
          last = next;
          onChange(next);
        }
      },
    };
  });
}

export function isProblemsPanelOpen(view: EditorView): boolean {
  return view.dom.querySelector('.cm-panel-lint') !== null;
}

export function toggleProblemsPanel(view: EditorView) {
  if (isProblemsPanelOpen(view)) closeLintPanel(view);
  else openLintPanel(view);
}

// Everything above in one go: inline lens, gutter markers, the panel keymap
// (F8 next problem, Ctrl-Shift-M toggle panel) and the counter.
export function diagnosticsUx(onCounts?: (counts: DiagnosticCounts) => void): Extension {
  return [
    diagnosticsLens(),
    lintGutter(),
    keymap.of(lintKeymap),
    ...(onCounts ? [diagnosticsCounter(onCounts)] : []),
  ];
}
