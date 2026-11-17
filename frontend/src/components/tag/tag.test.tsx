// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { Tag } from './tag';

describe('Tag', () => {
  test('renders children', () => {
    render(<Tag>Hello</Tag>);
    expect(screen.getByText('Hello')).toBeDefined();
  });

  test('applies default primary variant class', () => {
    const { container } = render(<Tag>X</Tag>);
    expect(container.firstElementChild.classList.contains('tag-primary')).toBe(true);
  });

  test('applies variant class', () => {
    const { container } = render(<Tag variant="danger">X</Tag>);
    expect(container.firstElementChild.classList.contains('tag-danger')).toBe(true);
  });

  test('applies custom className', () => {
    const { container } = render(<Tag className="custom">X</Tag>);
    expect(container.firstElementChild.classList.contains('custom')).toBe(true);
  });

  test('passes extra props to the div', () => {
    render(<Tag data-testid="my-tag">X</Tag>);
    expect(screen.getByTestId('my-tag')).toBeDefined();
  });
});
