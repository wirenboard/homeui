// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { SkipToContentButton } from './skip-to-content-button';

vi.mock('@/utils/focus-content', () => ({
  focusToMainContent: vi.fn(),
}));

describe('SkipToContentButton', () => {
  test('renders skip button', () => {
    render(<SkipToContentButton />);
    expect(screen.getByText('common.buttons.skip-to-main-content')).toBeDefined();
  });

  test('has container class', () => {
    const { container } = render(<SkipToContentButton />);
    expect(container.querySelector('.skipToContentButton-container')).toBeTruthy();
  });

  test('button has large size', () => {
    const { container } = render(<SkipToContentButton />);
    expect(container.querySelector('.button-l')).toBeTruthy();
  });
});
