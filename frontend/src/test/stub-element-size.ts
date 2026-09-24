import type { MockInstance } from 'vitest';

/**
 * happy-dom performs no layout, so every element reports zero size and a
 * virtualized list renders no rows inside a zero-height scroller. Call inside
 * `describe` to give all elements a nominal size, so the visible window
 * covers the rows under test.
 */
export const stubElementSizes = (height = 600, width = 800) => {
  let spies: MockInstance[] = [];

  beforeAll(() => {
    spies = [
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(height),
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(width),
    ];
  });

  afterAll(() => {
    spies.forEach((spy) => spy.mockRestore());
  });
};
