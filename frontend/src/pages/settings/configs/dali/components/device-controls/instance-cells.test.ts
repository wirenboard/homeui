// @vitest-environment happy-dom
import type Cell from '@/stores/devices/cell';
import { instanceGroups } from './instance-cells';

const cell = (
  controlId: string,
  name: string,
  type: string,
  { readOnly = false, order = 0, value = null as unknown } = {},
): Cell => ({ id: `dev/${controlId}`, controlId, name, type, readOnly, order, value } as unknown as Cell);

const names = (cells: Cell[]) => cells.map((c) => c.controlId);

const instance = (index: number, types: string[]) =>
  types.map((base, i) => cell(`${base}${index}`, `${base} ${index}`, 'switch',
    { readOnly: true, order: index * 10 + i + 1 }));

vi.mock('@/services', () => import('@/test/mocks/services'));

describe('instanceGroups, a DALI-2 input device', () => {
  const groups = (cells: Cell[]) => instanceGroups(cells).map(names);

  it('makes one group per instance, its controls in the daemon\'s order', () => {
    expect(groups([
      ...instance(1, ['button', 'long_press', 'short_press']),
      ...instance(0, ['button', 'long_press', 'short_press']),
    ])).toEqual([
      ['button0', 'long_press0', 'short_press0'],
      ['button1', 'long_press1', 'short_press1'],
    ]);
  });

  it('counts the instances a sixteen-instance sensor really has', () => {
    const sensor = Array.from({ length: 16 }, (_, i) => instance(i, ['occupied', 'movement'])).flat();
    const columns = instanceGroups(sensor);

    expect(columns).toHaveLength(16);
    expect(columns.map((column) => column[0].controlId).slice(0, 3))
      .toEqual(['occupied0', 'occupied1', 'occupied2']);
    expect(names(columns[0].slice(1))).toEqual(['movement0']);
  });

  it('gives device-wide feedback, which carries no instance number, a group after the instances', () => {
    expect(groups([
      ...instance(0, ['button']),
      cell('activate_feedback', 'Activate feedback', 'pushbutton', { order: 100 }),
      cell('stop_feedback', 'Stop feedback', 'pushbutton', { order: 101 }),
    ])).toEqual([['button0'], ['activate_feedback', 'stop_feedback']]);
  });
});
