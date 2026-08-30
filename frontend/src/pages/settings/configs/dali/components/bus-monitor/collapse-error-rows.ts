import type { ParsedBusMonitorLine } from '@/stores/dali/types';
import type { MonitorRow } from './types';

/**
 * Consecutive identical error rows collapse into one with a xN badge:
 * a DALI-2 device initializing probes absent features three times per
 * instance, and rendering every retry paints the whole viewport red for
 * what is one fact. Only error rows collapse — ordinary traffic keeps its
 * one-row-per-frame timeline, and foreign frames their counters. The kept
 * frame is the LATEST of the run, so the timestamp shows the last retry.
 */
export function collapseErrorRows(frames: ParsedBusMonitorLine[]): MonitorRow[] {
  const rows: MonitorRow[] = [];
  frames.forEach((frame) => {
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
    rows.push({ frame, repeat: 1 });
  });
  return rows;
}
