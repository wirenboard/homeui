// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { ConsoleLogScroller } from './console-log-scroller';

describe('ConsoleLogScroller', () => {
  test('renders children inside a polite log region', () => {
    const { container } = render(
      <ConsoleLogScroller scrollKey={2}>
        <div>row 1</div>
        <div>row 2</div>
      </ConsoleLogScroller>,
    );

    const region = container.querySelector('[role="log"]');
    expect(region).toBeTruthy();
    expect(region!.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('row 1')).toBeTruthy();
    expect(screen.getByText('row 2')).toBeTruthy();
  });
});
