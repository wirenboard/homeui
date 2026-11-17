// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Password } from './password';

describe('Password', () => {
  test('renders password input', () => {
    render(<Password value="secret" onChange={vi.fn()} />);
    const input = document.querySelector('input[type="password"]');
    expect(input).toBeTruthy();
  });

  test('toggles visibility on button click', () => {
    render(<Password value="secret" onChange={vi.fn()} />);
    const toggle = screen.getByLabelText('common.buttons.password-show');
    fireEvent.click(toggle);
    expect(document.querySelector('input[type="text"]')).toBeTruthy();
    expect(document.querySelector('input[type="password"]')).toBeNull();

    fireEvent.click(screen.getByLabelText('common.buttons.password-hide'));
    expect(document.querySelector('input[type="password"]')).toBeTruthy();
  });

  test('hides toggle button when disabled', () => {
    render(<Password value="secret" isDisabled onChange={vi.fn()} />);
    expect(screen.queryByLabelText('common.buttons.password-show')).toBeNull();
  });

  test('shows strength indicator when showIndicator is true', () => {
    const { container } = render(<Password value="abc" showIndicator onChange={vi.fn()} />);
    const indicators = container.querySelectorAll('.password-indicator');
    expect(indicators).toHaveLength(4);
  });

  test('hides strength indicator by default', () => {
    const { container } = render(<Password value="abc" onChange={vi.fn()} />);
    expect(container.querySelector('.password-indicator')).toBeNull();
  });

  test('applies fullWidth class', () => {
    const { container } = render(<Password value="" isFullWidth onChange={vi.fn()} />);
    expect(container.querySelector('.password-inputContainerFullWidth')).toBeTruthy();
  });
});
