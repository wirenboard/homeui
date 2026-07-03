// @vitest-environment happy-dom
import { render, fireEvent } from '@testing-library/react';
import { Switch } from './switch';

describe('Switch', () => {
  test('renders checked checkbox when value is true', () => {
    const { container } = render(<Switch value={true} onChange={vi.fn()} />);
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.checked).toBe(true);
  });

  test('renders unchecked checkbox when value is false', () => {
    const { container } = render(<Switch value={false} onChange={vi.fn()} />);
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.checked).toBe(false);
  });

  test('calls onChange with toggled value', () => {
    const onChange = vi.fn();
    const { container } = render(<Switch value={false} onChange={onChange} />);
    const input = container.querySelector('input[type="checkbox"]')!;
    fireEvent.click(input);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('disables input when isDisabled', () => {
    const { container } = render(<Switch value={false} isDisabled onChange={vi.fn()} />);
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  test('applies invalid class', () => {
    const { container } = render(<Switch value={false} isInvalid onChange={vi.fn()} />);
    expect(container.querySelector('.toggle-switchy-invalid')).toBeTruthy();
  });

  test('sets aria attributes', () => {
    const { container } = render(
      <Switch value={false} ariaLabel="toggle" ariaDescribedby="desc" onChange={vi.fn()} />,
    );
    const input = container.querySelector('input')!;
    expect(input.getAttribute('aria-label')).toBe('toggle');
    expect(input.getAttribute('aria-describedby')).toBe('desc');
  });
});
