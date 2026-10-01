// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { Loader } from './loader';

describe('Loader', () => {
  test('renders with status role', () => {
    render(<Loader />);
    expect(screen.getByRole('status', { hidden: true })).toBeDefined();
  });

  test('renders caption', () => {
    render(<Loader caption="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeDefined();
  });

  test('hides caption when not provided', () => {
    const { container } = render(<Loader />);
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });

  test('applies small size class', () => {
    const { container } = render(<Loader size="small" />);
    expect(container.querySelector('.loader-iconSmall')).toBeTruthy();
  });

  test('applies default size class', () => {
    const { container } = render(<Loader />);
    expect(container.querySelector('.loader-iconDefault')).toBeTruthy();
  });

  test('applies custom className', () => {
    const { container } = render(<Loader className="custom" />);
    expect(container.querySelector('.custom')).toBeTruthy();
  });
});
