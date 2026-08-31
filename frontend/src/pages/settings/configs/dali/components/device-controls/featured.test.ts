// @vitest-environment happy-dom
import type Cell from '@/stores/devices/cell';
import { FEATURED_LIMIT, mergeReadbacks, pickFeatured } from './device-controls';

/** The slice of Cell the heuristics read. */
const cell = (
  controlId: string,
  name: string,
  type: string,
  { readOnly = false, order = 0 } = {},
): Cell => ({ id: `dev/${controlId}`, controlId, name, type, readOnly, order } as unknown as Cell);

const names = (cells: Cell[]) => cells.map((c) => c.controlId);

vi.mock('@/services', () => import('@/test/mocks/services'));

describe('pickFeatured', () => {
  it('gives a broadcast device its sliders, colour and both power buttons', () => {
    const featured = pickFeatured([
      cell('dapc', 'Direct Arc Power Control', 'value'),
      cell('off', 'Off', 'pushbutton'),
      cell('up', 'Up', 'pushbutton'),
      cell('down', 'Down', 'pushbutton'),
      cell('step_up', 'Step Up', 'pushbutton'),
      cell('recall_max_level', 'Recall Max Level', 'pushbutton'),
      cell('recall_min_level', 'Recall Min Level', 'pushbutton'),
      cell('go_to_scene', 'Go To Scene', 'value'),
      cell('wanted_level', 'Wanted Level', 'range'),
      cell('set_colour_temperature', 'Wanted Colour Temperature', 'range'),
      cell('wanted_rgb', 'Wanted RGB', 'rgb'),
      cell('wanted_w', 'Wanted W', 'range'),
    ]);
    expect(names(featured)).toEqual([
      'wanted_level', 'wanted_rgb', 'off', 'recall_max_level', 'set_colour_temperature', 'wanted_w',
    ]);
  });

  it('keeps Off over the nice-to-haves when a lamp already fills the strip with readings', () => {
    const featured = pickFeatured([
      cell('actual_level', 'Actual Level', 'value', { readOnly: true }),
      cell('current_rgb', 'Current RGB', 'rgb', { readOnly: true }),
      cell('current_w', 'Current W', 'value', { readOnly: true }),
      cell('wanted_level', 'Wanted Level', 'range'),
      cell('wanted_rgb', 'Wanted RGB', 'rgb'),
      cell('wanted_w', 'Wanted W', 'range'),
      cell('recall_max_level', 'Recall Max Level', 'pushbutton'),
      cell('off', 'Off', 'pushbutton'),
    ]);
    expect(featured).toHaveLength(FEATURED_LIMIT);
    expect(names(featured)).toContain('off');
    expect(names(featured)).not.toContain('recall_max_level');
  });

  it('still hides a sensor\'s per-button noise while pinning its readings', () => {
    const buttons = Array.from({ length: 18 }, (_, i) =>
      cell(`button${i + 2}`, `Button ${i + 2}`, 'switch', { readOnly: true, order: 10 + i }));
    const featured = pickFeatured([
      cell('occupied0', 'Occupied 0', 'switch', { readOnly: true, order: 1 }),
      cell('movement0', 'Movement 0', 'switch', { readOnly: true, order: 2 }),
      cell('illuminance1', 'Illuminance 1', 'value', { readOnly: true, order: 3 }),
      ...buttons,
    ]);
    expect(names(featured)).toEqual(['occupied0', 'movement0', 'illuminance1']);
  });
});

describe('mergeReadbacks', () => {
  const all = [
    cell('actual_level', 'Actual Level', 'value', { readOnly: true, order: 1 }),
    cell('current_rgb', 'Current RGB', 'rgb', { readOnly: true, order: 2 }),
    cell('wanted_level', 'Wanted Level', 'range', { order: 10 }),
    cell('set_rgb', 'Set RGB', 'rgb', { order: 11 }),
    cell('off', 'Off', 'pushbutton', { order: 12 }),
    cell('illuminance1', 'Illuminance 1', 'value', { readOnly: true, order: 3 }),
  ];

  it('folds a featured reading into its setpoint control', () => {
    const merged = mergeReadbacks(pickFeatured(all), all);
    const shown = merged.map((entry) => entry.cell.controlId);
    expect(shown).toContain('wanted_level');
    expect(shown).toContain('set_rgb');
    expect(shown).not.toContain('actual_level');
    expect(merged.find((e) => e.cell.controlId === 'wanted_level')?.readback?.controlId).toBe('actual_level');
    expect(merged.find((e) => e.cell.controlId === 'set_rgb')?.readback?.controlId).toBe('current_rgb');
  });

  it('leaves an unpaired reading alone', () => {
    const merged = mergeReadbacks(pickFeatured(all), all);
    const lux = merged.find((entry) => entry.cell.controlId === 'illuminance1');
    expect(lux).toBeDefined();
    expect(lux?.readback).toBeUndefined();
  });
});
