// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { DateTimePicker } from './datetime-picker';

describe('DateTimePicker', () => {
  test('renders input', () => {
    const { container } = render(<DateTimePicker onChange={vi.fn()} />);
    const input = container.querySelector('input');
    expect(input).toBeTruthy();
  });

  test('renders with placeholder', () => {
    const { container } = render(
      <DateTimePicker placeholder="Pick date" onChange={vi.fn()} />,
    );
    const input = container.querySelector('input');
    expect(input!.getAttribute('placeholder')).toBe('Pick date');
  });

  test('renders calendar button when not disabled', () => {
    const { container } = render(<DateTimePicker onChange={vi.fn()} />);
    const btn = container.querySelector('.datetimePicker-openButton');
    expect(btn).toBeTruthy();
  });

  test('hides calendar button when disabled', () => {
    const { container } = render(<DateTimePicker disabled onChange={vi.fn()} />);
    const btn = container.querySelector('.datetimePicker-openButton');
    expect(btn).toBeNull();
  });

  test('disables input when disabled', () => {
    const { container } = render(<DateTimePicker disabled onChange={vi.fn()} />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  test('applies invalid class', () => {
    const { container } = render(<DateTimePicker isInvalid onChange={vi.fn()} />);
    expect(container.querySelector('.input-invalid')).toBeTruthy();
  });

  test('sets aria-label', () => {
    const { container } = render(<DateTimePicker ariaLabel="date" onChange={vi.fn()} />);
    const input = container.querySelector('input');
    expect(input!.getAttribute('aria-label')).toBe('date');
  });

  test('renders small size', () => {
    const { container } = render(<DateTimePicker size="small" onChange={vi.fn()} />);
    expect(container.querySelector('.input-s')).toBeTruthy();
  });

  test('formats initial value into input', () => {
    const date = new Date(2026, 0, 15, 10, 30);
    const { container } = render(<DateTimePicker value={date} onChange={vi.fn()} />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toContain('15');
    expect(input.value).toContain('2026');
  });
});
