// @vitest-environment happy-dom
import { render, screen } from '@/test/render';
import { ButtonLink } from './link';

describe('ButtonLink', () => {
  test('renders as link with label', () => {
    render(<ButtonLink to="/page" label="Go" />);
    const link = screen.getByText('Go').closest('a');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toBe('/page');
  });

  test('applies variant class', () => {
    const { container } = render(<ButtonLink to="/" label="X" variant="danger" />);
    expect(container.querySelector('.button-danger')).toBeTruthy();
  });

  test('applies size class', () => {
    const { container } = render(<ButtonLink to="/" label="X" size="small" />);
    expect(container.querySelector('.button-s')).toBeTruthy();
  });

  test('applies outlined class', () => {
    const { container } = render(<ButtonLink to="/" label="X" isOutlined />);
    expect(container.querySelector('.button-outlined')).toBeTruthy();
  });

  test('renders icon', () => {
    render(<ButtonLink to="/" icon={<span data-testid="ico" />} />);
    expect(document.querySelector('[data-testid="ico"]')).toBeTruthy();
  });
});
