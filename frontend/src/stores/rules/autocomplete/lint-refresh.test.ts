// @vitest-environment happy-dom
import { diagnosticCount, forEachDiagnostic } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { observable, runInAction } from 'mobx';
import type { RuleRuntimeError } from '../types';
import { controllerDiagnostics } from './controller-diagnostics';
import { runtimeErrorDiagnostics } from './runtime-errors';

// Diagnostics that come from OUTSIDE the editor (a console message, an RPC
// verdict) must show up without the user typing: @codemirror/lint's
// forceLinting() alone is a no-op when no lint pass is queued, which is the
// normal state of an idle editor. These tests drive a real EditorView and
// change only the store.

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DOC = 'defineRule("x", {\n  then: function () {\n    dev["a/b"] = 1;\n  },\n});';

async function untilCount(view: EditorView, want: number, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (diagnosticCount(view.state) === want) return;
    await wait(50);
  }
  throw new Error(`diagnosticCount stayed ${diagnosticCount(view.state)}, want ${want}`);
}

describe('runtimeErrorDiagnostics reacts to store changes without a document edit', () => {
  it('shows a runtime error that arrives after the idle editor finished its initial pass', async () => {
    const store = observable({ errors: [] as RuleRuntimeError[], running: DOC as string | null });
    const view = new EditorView({
      state: EditorState.create({
        doc: DOC,
        extensions: [runtimeErrorDiagnostics(() => store.errors, () => store.running)],
      }),
      parent: document.body,
    });
    try {
      await wait(900); // let the initial lint pass run and go idle
      expect(diagnosticCount(view.state)).toBe(0);
      runInAction(() => {
        store.errors.push({ path: '/etc/wb-rules/x.js', line: 3, message: 'write ignored', count: 1, lastSeen: 0 });
      });
      await untilCount(view, 1);
      // a REPEAT of the same error (count/lastSeen change) must not re-run the
      // linters: that would replace the diagnostic set and close an open
      // tooltip every time the rule fails again. Count the lint passes via a
      // marker effect-free probe: the diagnostic object identity must survive.
      let before: unknown;
      forEachDiagnostic(view.state, (d) => {
        before = d;
      });
      runInAction(() => {
        store.errors[0].count = 7;
        store.errors[0].lastSeen = 12345;
      });
      await wait(1200);
      let after: unknown;
      forEachDiagnostic(view.state, (d) => {
        after = d;
      });
      expect(after).toBe(before);
      // and it hides again once the running content no longer matches
      runInAction(() => {
        store.running = DOC + '\n// changed on the controller';
      });
      await untilCount(view, 0);
    } finally {
      view.destroy();
    }
  });
});

describe('controllerDiagnostics reacts to a late verdict without a document edit', () => {
  it('shows the controller verdict that lands after the initial pass', async () => {
    const store = observable({
      diags: [] as { line: number; column: number; severity: 'error'; message: string }[],
      checked: null as string | null,
    });
    const view = new EditorView({
      state: EditorState.create({
        doc: DOC,
        extensions: [controllerDiagnostics(() => ({ diags: store.diags, checkedContent: store.checked }))],
      }),
      parent: document.body,
    });
    try {
      await wait(900);
      expect(diagnosticCount(view.state)).toBe(0);
      runInAction(() => {
        store.diags = [{ line: 3, column: 5, severity: 'error', message: 'controller says no' }];
        store.checked = DOC;
      });
      await untilCount(view, 1);
    } finally {
      view.destroy();
    }
  });
});
