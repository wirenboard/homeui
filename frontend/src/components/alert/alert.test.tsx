// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Alert } from './alert';

describe('Alert', () => {
  test('renders children', () => {
    render(<Alert>Something happened</Alert>);
    expect(screen.getByText('Something happened')).toBeDefined();
  });

  test('has role="alert"', () => {
    render(<Alert>msg</Alert>);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  test('applies variant class', () => {
    const { container } = render(<Alert variant="danger">err</Alert>);
    expect(container.querySelector('.alertMessage-danger')).toBeTruthy();
  });

  test('applies small size class', () => {
    const { container } = render(<Alert size="small">msg</Alert>);
    expect(container.querySelector('.alertMessage-s')).toBeTruthy();
  });

  test('hides icon when withIcon=false', () => {
    const { container } = render(<Alert withIcon={false}>msg</Alert>);
    expect(container.querySelector('.alertMessage-icon')).toBeNull();
  });

  test('renders close button when onClose provided', () => {
    const onClose = vi.fn();
    const { container } = render(<Alert onClose={onClose}>msg</Alert>);
    const closeBtn = container.querySelector('.alertMessage-close');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('no close button when onClose is not provided', () => {
    const { container } = render(<Alert>msg</Alert>);
    expect(container.querySelector('.alertMessage-close')).toBeNull();
  });
});
