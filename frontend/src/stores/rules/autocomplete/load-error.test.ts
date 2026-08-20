import { Text } from '@codemirror/state';
import { loadErrorSummary, loadErrorToCm } from './load-error';

const doc = Text.of([
  'defineRule("x", {',
  '  whenChanged: "a/b",',
  '  then: function () { oops( }',
  '});',
]);

describe('loadErrorToCm', () => {
  it('marks the reported line with the first line of the message, skipping indentation', () => {
    const diags = loadErrorToCm(doc, {
      message: 'SyntaxError: parse error (line 3)\n    at F (/etc/wb-rules/x.js:3)',
      errorLine: 3,
    });
    expect(diags).toHaveLength(1);
    const line = doc.line(3);
    expect(diags[0]).toMatchObject({
      from: line.from + 2,
      to: line.to,
      severity: 'error',
      source: 'load',
      message: 'SyntaxError: parse error (line 3)',
    });
  });

  it('renders nothing without an error, without a line, or with a line outside the document', () => {
    expect(loadErrorToCm(doc, null)).toEqual([]);
    expect(loadErrorToCm(doc, { message: 'x' })).toEqual([]);
    expect(loadErrorToCm(doc, { message: 'x', errorLine: null })).toEqual([]);
    expect(loadErrorToCm(doc, { message: 'x', errorLine: 0 })).toEqual([]);
    expect(loadErrorToCm(doc, { message: 'x', errorLine: 99 })).toEqual([]);
  });

  it('falls back to a generic text for an empty message', () => {
    expect(loadErrorToCm(doc, { message: '', errorLine: 1 })[0].message).toBe('load error');
    // the page passes a translated label
    expect(loadErrorToCm(doc, { message: '', errorLine: 1 }, 'Ошибка загрузки')[0].message)
      .toBe('Ошибка загрузки');
  });
});

describe('loadErrorSummary', () => {
  it('keeps only the first line', () => {
    expect(loadErrorSummary('  A: b \n at c')).toBe('A: b');
    expect(loadErrorSummary('single')).toBe('single');
  });
});
