import type { ParsedBusMonitorLine } from '@/stores/dali/types';
import { collapseErrorRows } from './collapse-error-rows';
import type { SequencedBusMonitorFrame } from './types';

const line = (over: Record<string, any> = {}): ParsedBusMonitorLine => ({
  time: '12:00:00',
  hex: 'a3fe',
  command: 'QueryActualLevel(0)',
  direction: 'out',
  badges: {},
  ...over,
  response: { kind: 'error', text: 'no response', ...(over.response ?? {}) },
} as ParsedBusMonitorLine);

const seq = (frames: ParsedBusMonitorLine[]): SequencedBusMonitorFrame[] => (
  frames.map((frame, i) => ({ seq: 100 + i, frame }))
);

describe('collapseErrorRows: identical consecutive errors fold into one ×N row', () => {
  it('counts a run of identical errors once, keeping the latest frame', () => {
    const rows = collapseErrorRows(seq([
      line({ time: '12:00:00' }),
      line({ time: '12:00:01' }),
      line({ time: '12:00:02' }),
    ]));
    expect(rows).toHaveLength(1);
    expect(rows[0].repeat).toBe(3);
    expect(rows[0].frame.time).toBe('12:00:02');
    // The key stays the run's first seq, so the virtualized slot does not move.
    expect(rows[0].seq).toBe(100);
  });

  it('a differing hex, command or response text breaks the run', () => {
    expect(collapseErrorRows(seq([line(), line({ hex: 'a3ff' })]))).toHaveLength(2);
    expect(collapseErrorRows(seq([line(), line({ command: 'Other' })]))).toHaveLength(2);
    expect(collapseErrorRows(seq([line(), line({ response: { text: 'framing error' } })]))).toHaveLength(2);
  });

  it('ordinary traffic never collapses, even when byte-identical', () => {
    const ok = line({ response: { kind: 'value', text: '42' } });
    const rows = collapseErrorRows(seq([ok, ok]));
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.repeat === 1)).toBe(true);
  });
});
