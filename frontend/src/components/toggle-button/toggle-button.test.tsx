// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleButton } from './toggle-button';

describe('ToggleButton', () => {
  test('renders label', () => {
    render(<ToggleButton label="Grid" enabled={false} />);
    expect(screen.getByText('Grid')).toBeDefined();
  });

  test('applies active class when enabled', () => {
    const { container } = render(<ToggleButton label="X" enabled={true} />);
    expect(container.querySelector('.toggleButton-active')).toBeTruthy();
  });

  test('no active class when disabled', () => {
    const { container } = render(<ToggleButton label="X" enabled={false} />);
    expect(container.querySelector('.toggleButton-active')).toBeNull();
  });

  test('fires onClick', () => {
    const onClick = vi.fn();
    render(<ToggleButton label="X" enabled={false} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  test('applies custom className', () => {
    const { container } = render(<ToggleButton label="X" enabled={false} className="custom" />);
    expect(container.querySelector('.custom')).toBeTruthy();
  });

  test('has type=button', () => {
    render(<ToggleButton label="X" enabled={false} />);
    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });
});
