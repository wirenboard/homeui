// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
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

  test('pinned to the bottom, an appended row measuring taller than its estimate lands at the new bottom', () => {
    const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ seq: i, text: `row ${i}` }));
    const scroller = (n: number) => (
      <ConsoleLogScroller
        scrollKey={n}
        items={rows(n)}
        estimateRowHeight={20}
        renderRow={({ text }) => <div>{text}</div>}
      />
    );
    const { container, rerender } = render(scroller(2));
    const region = container.querySelector<HTMLElement>('[role="log"]')!;
    const contentHeight = () => parseFloat(container.querySelector<HTMLElement>('.consolePanel-rows')!.style.height);
    // happy-dom has no layout, so scrollHeight follows the committed rows container.
    Object.defineProperty(region, 'scrollHeight', { get: contentHeight });
    const scrollTo = vi.spyOn(region, 'scrollTo');

    rerender(scroller(3));

    // Rows are estimated at 20px but measure 600px (the stub).
    expect(contentHeight()).toBe(1800);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1800 });
  });
});

describe('ConsoleLogScroller scrolled up into a capped buffer', () => {
  // Every element is 20px tall, so a row's position is index * 20.
  stubElementSizes(20);

  const rows = (from: number) => Array.from({ length: 100 }, (_, i) => ({ seq: from + i, text: `row ${from + i}` }));
  const scroller = (from: number) => (
    <ConsoleLogScroller
      scrollKey={from + 99}
      items={rows(from)}
      estimateRowHeight={20}
      renderRow={({ text }) => <div>{text}</div>}
    />
  );

  test('dropping rows off the top keeps the rows in view in place and only moves scrollTop', () => {
    const { container, rerender } = render(scroller(0));
    const region = container.querySelector<HTMLElement>('[role="log"]')!;
    // happy-dom reports no scroll extent, so tell the auto-scroll the list is taller than the viewport.
    Object.defineProperty(region, 'scrollHeight', { value: 2000 });
    region.scrollTop = 400;
    fireEvent.scroll(region);
    expect(screen.getByText('row 20').parentElement!.style.transform).toBe('translateY(400px)');

    rerender(scroller(5));

    expect(region.scrollTop).toBe(300);
    expect(screen.getByText('row 20').parentElement!.style.transform).toBe('translateY(300px)');
    expect(screen.queryByText('row 4')).toBeNull();
  });
});
