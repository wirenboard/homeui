// @vitest-environment happy-dom
import type Cell from '@/stores/devices/cell';
import { pickGear } from './gear-cells';

const cell = (
  controlId: string,
  name: string,
  type: string,
  { readOnly = false, order = 0, value = null as unknown } = {},
): Cell => ({ id: `dev/${controlId}`, controlId, name, type, readOnly, order, value } as unknown as Cell);

const names = (cells: Cell[]) => cells.map((c) => c.controlId);

vi.mock('@/services', () => import('@/test/mocks/services'));

describe('pickGear', () => {
  it('fills the pinned controls from the fixed list of ids and pushes the tail into the list', () => {
    const pinnedControls = pickGear([
      cell('on_off', 'On / Off', 'switch', { order: 2 }),
      cell('wanted_level', 'Wanted Level', 'range', { order: 4 }),
      cell('dapc', 'Direct Arc Power Control', 'value', { order: 5 }),
      cell('off', 'Off', 'pushbutton', { order: 7 }),
      cell('up', 'Up', 'pushbutton', { order: 8 }),
      cell('recall_max_level', 'Recall Max Level', 'pushbutton', { order: 12 }),
      cell('recall_min_level', 'Recall Min Level', 'pushbutton', { order: 13 }),
      cell('go_to_scene', 'Go To Scene', 'value', { order: 16 }),
      cell('set_rgb', 'Wanted RGB', 'rgb', { order: 18 }),
      cell('set_white', 'Wanted W', 'range', { order: 20 }),
    ]);
    expect(names(pinnedControls)).toEqual([
      'on_off', 'wanted_level', 'set_rgb', 'set_white', 'go_to_scene',
    ]);
  });

  it('spends all the pinned controls on the setpoints when a DT8 device has six primaries', () => {
    const pinnedControls = pickGear([
      cell('on_off', 'On / Off', 'switch', { order: 2 }),
      cell('wanted_level', 'Wanted Level', 'range', { order: 4 }),
      cell('off', 'Off', 'pushbutton', { order: 7 }),
      ...Array.from({ length: 6 }, (_, i) =>
        cell(`set_primary_n${i}`, `Wanted Primary N${i}`, 'range', { order: 20 + i })),
    ]);
    expect(names(pinnedControls)).toEqual([
      'on_off', 'wanted_level', 'set_primary_n0', 'set_primary_n1', 'set_primary_n2', 'set_primary_n3',
    ]);
  });

  it('leaves Off and Recall Max Level to the list when the On/Off switch is among the pinned controls', () => {
    const pinnedControls = pickGear([
      cell('on_off', 'On / Off', 'switch', { order: 2 }),
      cell('wanted_level', 'Wanted Level', 'range', { order: 4 }),
      cell('off', 'Off', 'pushbutton', { order: 7 }),
      cell('recall_max_level', 'Recall Max Level', 'pushbutton', { order: 12 }),
      cell('go_to_scene', 'Go To Scene', 'value', { order: 16 }),
    ]);
    expect(names(pinnedControls)).toEqual(['on_off', 'wanted_level', 'go_to_scene']);
  });

  it('takes the level even when the daemon publishes no On/Off block', () => {
    const pinnedControls = pickGear([
      cell('wanted_level', 'Wanted Level', 'range', { order: 3 }),
      cell('off', 'Off', 'pushbutton', { order: 6 }),
    ]);
    expect(names(pinnedControls)).toEqual(['wanted_level', 'off']);
  });
});
