import { Text } from '@codemirror/state';
import type { TsCheckDiag } from '../types';
import { controllerDiagsForDoc, controllerDiagsToCm } from './controller-diagnostics';

describe('controllerDiagsToCm', () => {
  const doc = Text.of(['const a = 1;', 'let b: number = 0;', 'b = \'oops\';']);

  it('anchors a diagnostic at the reported line and column, spanning to end of line', () => {
    const diags: TsCheckDiag[] = [
      { line: 3, column: 1, severity: 'error', message: 'Type \'string\' is not assignable to type \'number\'.' },
    ];
    const [d] = controllerDiagsToCm(doc, diags);
    expect(d.from).toBe(doc.line(3).from);
    expect(d.to).toBe(doc.line(3).to);
    expect(d.severity).toBe('error');
    expect(d.source).toBe('controller (tsgo)');
  });

  it('drops controller entries the local language service already shows, keeps skew-only ones', () => {
    const diags: TsCheckDiag[] = [
      { line: 3, column: 1, severity: 'error', message: 'same finding' },
      { line: 3, column: 1, severity: 'error', message: 'controller-only finding' },
    ];
    const local = [{ line: 3, message: 'same finding' }];
    const result = controllerDiagsToCm(doc, diags, local);
    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('controller-only finding');
  });

  it('de-duplicates by message prefix: the controller carries only the head line of chains', () => {
    const diags: TsCheckDiag[] = [
      { line: 3, column: 1, severity: 'error', message: 'Argument of type \'X\' is not assignable.' },
    ];
    const local = [
      { line: 3, message: 'Argument of type \'X\' is not assignable. Types of property \'x\' are incompatible.' },
    ];
    expect(controllerDiagsToCm(doc, diags, local)).toHaveLength(0);
  });

  it('skips diagnostics belonging to another file (import/reference)', () => {
    const diags: TsCheckDiag[] = [
      { file: 'helper.ts', line: 1, column: 1, severity: 'error', message: 'foreign' },
    ];
    expect(controllerDiagsToCm(doc, diags)).toHaveLength(0);
  });

  it('clamps out-of-range lines and columns instead of throwing', () => {
    const diags: TsCheckDiag[] = [
      { line: 99, column: 1, severity: 'error', message: 'gone' },
      { line: 1, column: 500, severity: 'warning', message: 'far right' },
    ];
    const result = controllerDiagsToCm(doc, diags);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe(doc.line(1).to);
    expect(result[0].severity).toBe('warning');
  });
});

describe('controllerDiagsForDoc', () => {
  const doc = Text.of(['let n: number = 0;', 'n = \'oops\';']);
  const diags = [
    { line: 2, column: 1, severity: 'error' as const, message: 'stale finding' },
  ];

  it('renders the verdict while the document matches the checked content', () => {
    const verdict = { diags, checkedContent: doc.toString() };
    expect(controllerDiagsForDoc(doc, verdict)).toHaveLength(1);
  });

  it('suppresses the verdict once the user edits: a fixed line must not keep its old squiggle', () => {
    const verdict = { diags, checkedContent: 'let n: number = 0;\nn = 5;' };
    expect(controllerDiagsForDoc(doc, verdict)).toHaveLength(0);
  });

  it('renders nothing when no check has completed yet', () => {
    expect(controllerDiagsForDoc(doc, { diags, checkedContent: null })).toHaveLength(0);
  });
});

describe('controllerDiagsForDoc line endings', () => {
  it('matches CRLF checked content against the LF-normalized editor document', () => {
    // CodeMirror normalizes to \n on ingest; a rule saved with CRLF
    // (scp from Windows) must still get its controller verdict rendered
    const doc = Text.of(['let n: number = 0;', 'n = \'oops\';']);
    const diags = [{ line: 2, column: 1, severity: 'error' as const, message: 'finding' }];
    const verdict = { diags, checkedContent: 'let n: number = 0;\r\nn = \'oops\';' };
    expect(controllerDiagsForDoc(doc, verdict)).toHaveLength(1);
  });
});

describe('controllerDiagsToCm and the load error', () => {
  const doc = Text.of(['const a = ;', 'const b = 1;']);

  it('drops the controller error that repeats the load error of a .ts that failed to transpile', () => {
    const diags: TsCheckDiag[] = [
      { line: 1, column: 11, severity: 'error', message: 'Expression expected.', code: 1109 },
      { line: 1, column: 1, severity: 'error', message: 'a type error on the same line', code: 2322 },
      { line: 2, column: 1, severity: 'warning', message: 'unrelated' },
    ];
    expect(controllerDiagsToCm(doc, diags, [], 1).map((d) => d.message))
      .toEqual(['a type error on the same line', 'unrelated']);
    expect(controllerDiagsToCm(doc, diags, [], null)).toHaveLength(3);
    // the transpile failure itself carries no code
    expect(controllerDiagsToCm(doc, [{ line: 1, column: 11, severity: 'error', message: 'x' }], [], 1)).toEqual([]);
  });
});
