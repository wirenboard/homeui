// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { stubElementSizes } from '@/test/stub-element-size';
import { ConsoleLogScroller } from './console-log-scroller';

describe('ConsoleLogScroller', () => {
  stubElementSizes();

  test('renders rows inside a polite log region', () => {
    const items = [
      { seq: 1, text: 'row 1' },
      { seq: 2, text: 'row 2' },
    ];
    const { container } = render(
      <ConsoleLogScroller
        scrollKey={2}
        items={items}
        estimateRowHeight={20}
        renderRow={({ text }) => <div>{text}</div>}
      />,
    );

    const region = container.querySelector('[role="log"]');
    expect(region).toBeTruthy();
    expect(region!.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('row 1')).toBeTruthy();
    expect(screen.getByText('row 2')).toBeTruthy();
  });
});
