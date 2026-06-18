// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  test('renders label', () => {
    render(<Button label="Click me" />);
    expect(screen.getByText('Click me')).toBeDefined();
  });

  test('defaults to type=button', () => {
    render(<Button label="Btn" />);
    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  test('respects type prop', () => {
    render(<Button label="Sub" type="submit" />);
    expect(screen.getByRole('button').getAttribute('type')).toBe('submit');
  });

  test('applies variant class', () => {
    const { container } = render(<Button label="X" variant="danger" />);
    expect(container.querySelector('.button-danger')).toBeTruthy();
  });

  test('applies size class', () => {
    const { container } = render(<Button label="X" size="small" />);
    expect(container.querySelector('.button-s')).toBeTruthy();
  });

  test('applies outlined class', () => {
    const { container } = render(<Button label="X" isOutlined />);
    expect(container.querySelector('.button-outlined')).toBeTruthy();
  });

  test('sets aria-busy when loading', () => {
    render(<Button label="X" isLoading />);
    expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true');
  });

  test('fires onClick', () => {
    const onClick = vi.fn();
    render(<Button label="X" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  test('renders icon', () => {
    const { container } = render(<Button icon={<span data-testid="ico" />} />);
    expect(container.querySelector('[data-testid="ico"]')).toBeTruthy();
  });

  test('does not render label span when no label', () => {
    const { container } = render(<Button />);
    expect(container.querySelector('.button-text')).toBeNull();
  });
});
