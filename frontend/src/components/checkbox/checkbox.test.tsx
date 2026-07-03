// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  test('renders with title', () => {
    render(<Checkbox checked={false} title="Accept" onChange={vi.fn()} />);
    expect(screen.getByText('Accept')).toBeDefined();
  });

  test('checkbox is checked when checked=true', () => {
    render(<Checkbox checked={true} title="Yes" onChange={vi.fn()} />);
    const input = screen.getByRole('checkbox') as HTMLInputElement;
    expect(input.checked).toBe(true);
  });

  test('calls onChange with new value on click', () => {
    const onChange = vi.fn();
    render(<Checkbox checked={false} title="Toggle" onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('disables checkbox', () => {
    render(<Checkbox checked={false} isDisabled onChange={vi.fn()} />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
  });

  test('sets aria attributes', () => {
    render(
      <Checkbox
        checked={false}
        ariaLabel="check"
        ariaDescribedby="help"
        ariaInvalid={true}
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByRole('checkbox');
    expect(input.getAttribute('aria-label')).toBe('check');
    expect(input.getAttribute('aria-describedby')).toBe('help');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  test('button variant renders a button', () => {
    const onChange = vi.fn();
    render(<Checkbox checked={false} title="Btn" variant="button" onChange={onChange} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDefined();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('button variant shows pressed when checked', () => {
    render(<Checkbox checked={true} title="Btn" variant="button" onChange={vi.fn()} />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });
});
