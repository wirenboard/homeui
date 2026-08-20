// @vitest-environment happy-dom
import { setDiagnostics } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type DiagnosticCounts, diagnosticsUx, isProblemsPanelOpen, toggleProblemsPanel } from './diagnostics-ux';

const DOC = 'var a = 1;\ndev["buzzer/enabled"] = 1;\nlog(a);';

function makeView(onCounts?: Parameters<typeof diagnosticsUx>[0]) {
  return new EditorView({
    state: EditorState.create({ doc: DOC, extensions: [diagnosticsUx(onCounts)] }),
    parent: document.body,
  });
}

function pushDiagnostics(view: EditorView, diags: Parameters<typeof setDiagnostics>[1]) {
  view.dispatch(setDiagnostics(view.state, diags));
}

const line2 = { from: DOC.indexOf('dev'), to: DOC.indexOf(';', DOC.indexOf('dev')) };

describe('diagnostics lens', () => {
  it('renders the message inline after the offending line, colored by severity', () => {
    const view = makeView();
    try {
      expect(view.dom.querySelectorAll('.cm-wb-lens')).toHaveLength(0);
      pushDiagnostics(view, [
        { ...line2, severity: 'error', message: 'Type \'number\' is not assignable to type \'boolean\'.' },
      ]);
      const lens = view.dom.querySelectorAll('.cm-wb-lens');
      expect(lens).toHaveLength(1);
      expect(lens[0].textContent).toBe('Type \'number\' is not assignable to type \'boolean\'.');
      expect(lens[0].classList.contains('cm-wb-lens-error')).toBe(true);
      // it sits on line 2
      const lineEl = lens[0].closest('.cm-line');
      expect(lineEl?.textContent).toContain('dev["buzzer/enabled"]');
    } finally {
      view.destroy();
    }
  });

  it('shows one lens per line: worst severity, first message, +N, all messages in the title', () => {
    const view = makeView();
    try {
      pushDiagnostics(view, [
        { ...line2, severity: 'warning', message: 'first warning' },
        { ...line2, severity: 'error', message: 'the error\nwith a second line' },
      ]);
      const lens = view.dom.querySelectorAll('.cm-wb-lens');
      expect(lens).toHaveLength(1);
      expect(lens[0].textContent).toBe('the error  (+1)');
      expect(lens[0].classList.contains('cm-wb-lens-error')).toBe(true);
      expect((lens[0] as HTMLElement).title).toBe('first warning\nthe error\nwith a second line');
    } finally {
      view.destroy();
    }
  });

  it('disappears when the diagnostics are cleared', () => {
    const view = makeView();
    try {
      pushDiagnostics(view, [{ ...line2, severity: 'error', message: 'e' }]);
      expect(view.dom.querySelectorAll('.cm-wb-lens')).toHaveLength(1);
      pushDiagnostics(view, []);
      expect(view.dom.querySelectorAll('.cm-wb-lens')).toHaveLength(0);
    } finally {
      view.destroy();
    }
  });
});

describe('diagnostics counter and problems panel', () => {
  it('reports counts on mount and on every change', () => {
    const seen: DiagnosticCounts[] = [];
    const view = makeView((c) => seen.push(c));
    try {
      expect(seen).toEqual([{ errors: 0, warnings: 0, total: 0 }]);
      pushDiagnostics(view, [
        { ...line2, severity: 'error', message: 'e' },
        { from: 0, to: 3, severity: 'warning', message: 'w' },
      ]);
      expect(seen.at(-1)).toEqual({ errors: 1, warnings: 1, total: 2 });
      pushDiagnostics(view, [{ ...line2, severity: 'error', message: 'e' }]);
      expect(seen.at(-1)).toEqual({ errors: 1, warnings: 0, total: 1 });
      expect(seen).toHaveLength(3);
    } finally {
      view.destroy();
    }
  });

  it('toggles the problems panel, which lists the diagnostics', () => {
    const view = makeView();
    try {
      pushDiagnostics(view, [{ ...line2, severity: 'error', message: 'listed in the panel' }]);
      expect(isProblemsPanelOpen(view)).toBe(false);
      toggleProblemsPanel(view);
      expect(isProblemsPanelOpen(view)).toBe(true);
      expect(view.dom.querySelector('.cm-panel-lint')?.textContent).toContain('listed in the panel');
      toggleProblemsPanel(view);
      expect(isProblemsPanelOpen(view)).toBe(false);
    } finally {
      view.destroy();
    }
  });

  it('adds gutter markers for lines with diagnostics', () => {
    const view = makeView();
    try {
      pushDiagnostics(view, [{ ...line2, severity: 'error', message: 'e' }]);
      expect(view.dom.querySelectorAll('.cm-gutter-lint .cm-lint-marker').length).toBeGreaterThan(0);
    } finally {
      view.destroy();
    }
  });
});
