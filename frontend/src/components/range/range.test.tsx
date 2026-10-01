// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Range } from './range';

describe('Range', () => {
  test('renders range input', () => {
    render(<Range id="test" isDisabled={false} value={50} min={0} max={100} step={1} onChange={vi.fn()} />);
    expect(screen.getByRole('slider')).toBeDefined();
  });

  test('sets min/max/step', () => {
    render(<Range id="test" isDisabled={false} value={5} min={0} max={10} step={0.5} onChange={vi.fn()} />);
    const input = screen.getByRole('slider') as HTMLInputElement;
    expect(input.min).toBe('0');
    expect(input.max).toBe('10');
    expect(input.step).toBe('0.5');
  });

  test('disables input', () => {
    render(<Range id="test" value={0} min={0} max={100} step={1} isDisabled onChange={vi.fn()} />);
    expect((screen.getByRole('slider') as HTMLInputElement).disabled).toBe(true);
  });

  test('calls onChange on mouseUp', () => {
    const onChange = vi.fn();
    render(<Range id="test" isDisabled={false} value={50} min={0} max={100} step={1} onChange={onChange} />);
    fireEvent.mouseUp(screen.getByRole('slider'));
    expect(onChange).toHaveBeenCalledWith(50);
  });

  test('displays value label with units', () => {
    const { container } = render(
      <Range
        id="test"
        isDisabled={false}
        value={42}
        min={0}
        max={100}
        step={1}
        units="°C"
        onChange={vi.fn()}
      />);
    expect(container.textContent).toContain('42');
    expect(container.textContent).toContain('°C');
  });

  test('uses custom formatLabel', () => {
    const { container } = render(
      <Range
        id="test"
        isDisabled={false}
        value={60}
        min={0}
        max={100}
        step={1}
        formatLabel={(v) => `${v}%`}
        onChange={vi.fn()}
      />,
    );
    expect(container.textContent).toContain('60%');
  });

  test('applies invalid class', () => {
    const { container } = render(
      <Range
        id="test"
        isDisabled={false}
        value={0}
        min={0}
        max={100}
        step={1}
        isInvalid
        onChange={vi.fn()}
      />,
    );
    expect(container.querySelector('.range-invalid')).toBeTruthy();
  });

  test('hides label when labelPosition=none', () => {
    const { container } = render(
      <Range
        id="test"
        isDisabled={false}
        value={50}
        min={0}
        max={100}
        step={1}
        labelPosition="none"
        onChange={vi.fn()}
      />,
    );
    expect(container.querySelector('.range-value')).toBeNull();
  });

  test('sets aria-label', () => {
    render(
      <Range
        id="test"
        isDisabled={false}
        value={0}
        min={0}
        max={100}
        step={1}
        ariaLabel="volume"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('slider').getAttribute('aria-label')).toBe('volume');
  });
});
