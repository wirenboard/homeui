import type { MonitorRow, SequencedBusMonitorFrame } from './types';

/**
 * Consecutive identical error rows collapse into one with a xN badge:
 * a DALI-2 device initializing probes absent features three times per
 * instance, and rendering every retry paints the whole viewport red for
 * what is one fact. Only error rows collapse — ordinary traffic keeps its
 * one-row-per-frame timeline, and foreign frames their counters. The kept
 * frame is the LATEST of the run, so the timestamp shows the last retry; the
 * row keeps the FIRST frame's seq, so its key — and the virtualized log's
 * measured slot — stays put while the run grows.
 */
export function collapseErrorRows(frames: SequencedBusMonitorFrame[]): MonitorRow[] {
  const rows: MonitorRow[] = [];
  frames.forEach(({ seq, frame }) => {
    const prev = rows[rows.length - 1];
    if (
      prev
      && frame.response.kind === 'error'
      && prev.frame.response.kind === 'error'
      && prev.frame.hex === frame.hex
      && prev.frame.command === frame.command
      && prev.frame.response.text === frame.response.text
    ) {
      prev.repeat += 1;
      prev.frame = frame;
      return;
    }
    rows.push({ seq, frame, repeat: 1 });
  });
  return rows;
}
