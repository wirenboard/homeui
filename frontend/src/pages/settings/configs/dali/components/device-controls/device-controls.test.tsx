// @vitest-environment happy-dom
import type Cell from '@/stores/devices/cell';
import { render, screen } from '@/test/render';
import { ReadbackSuffix } from './device-controls';

vi.mock('@/services', () => import('@/test/mocks/services'));

/** The slice of Cell the readback suffix reads. */
const cell = (controlId: string, name: string, type: string, value: unknown, units?: string): Cell =>
  ({ id: `dev/${controlId}`, controlId, name, type, value, units, readOnly: true } as unknown as Cell);

describe('ReadbackSuffix', () => {
  it('explains the bracketed reading in a tooltip, since the slot is now named for the quantity', () => {
    render(<ReadbackSuffix cell={cell('actual_level', 'Actual Level', 'value', 42, '%')} />);
    const readback = screen.getByTitle('dali.labels.readback-tooltip');
    expect(readback).toHaveTextContent('(42 %)');
  });

  it('keeps the colour value in the swatch tooltip, which the swatch itself cannot show', () => {
    render(<ReadbackSuffix cell={cell('current_rgb', 'Current RGB', 'rgb', '#ff8800')} />);
    expect(screen.getByTitle('dali.labels.readback-tooltip: #ff8800')).toBeInTheDocument();
  });
});
