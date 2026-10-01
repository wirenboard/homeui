import { getOverflowIds } from './get-overflow-ids';

const makeTabs = (...ids: string[]) => ids.map((id) => ({ id }));

describe('getOverflowIds', () => {
  test('returns empty set when no tabs', () => {
    const result = getOverflowIds([], {}, 500, null, 26);
    expect(result.size).toBe(0);
  });

  test('returns empty set when areaWidth is 0', () => {
    const tabs = makeTabs('a', 'b');
    const result = getOverflowIds(tabs, { a: 100, b: 100 }, 0, 'a', 26);
    expect(result.size).toBe(0);
  });

  test('returns empty set when all tabs fit', () => {
    const tabs = makeTabs('a', 'b', 'c');
    const widths = { a: 100, b: 100, c: 100 };
    const result = getOverflowIds(tabs, widths, 300, 'a', 26);
    expect(result.size).toBe(0);
  });

  test('returns empty set when tabs exactly fill area', () => {
    const tabs = makeTabs('a', 'b');
    const widths = { a: 150, b: 150 };
    const result = getOverflowIds(tabs, widths, 300, 'a', 26);
    expect(result.size).toBe(0);
  });

  test('overflows last tabs when total exceeds area', () => {
    const tabs = makeTabs('a', 'b', 'c');
    const widths = { a: 100, b: 100, c: 100 };
    // total = 300, area = 250 → overflow needed
    // available = 250 - 26 (btn) - 100 (active 'a') = 124
    // 'b' = 100 fits (124 - 100 = 24), 'c' = 100 doesn't fit
    const result = getOverflowIds(tabs, widths, 250, 'a', 26);
    expect(result).toEqual(new Set(['c']));
  });

  test('active tab is always visible even if it would not fit by position', () => {
    const tabs = makeTabs('a', 'b', 'c');
    const widths = { a: 100, b: 100, c: 100 };
    // active = 'c' (last tab)
    // total = 300, area = 250 → overflow
    // available = 250 - 26 - 100 (active 'c') = 124
    // 'a' = 100 fits (24 left), 'b' = 100 doesn't fit
    const result = getOverflowIds(tabs, widths, 250, 'c', 26);
    expect(result.has('c')).toBe(false);
    expect(result).toEqual(new Set(['b']));
  });

  test('overflows multiple tabs', () => {
    const tabs = makeTabs('a', 'b', 'c', 'd', 'e');
    const widths = { a: 80, b: 80, c: 80, d: 80, e: 80 };
    // total = 400, area = 200 → overflow
    // available = 200 - 26 - 80 (active 'a') = 94
    // 'b' = 80 fits (14 left), 'c' doesn't, 'd' doesn't, 'e' doesn't
    const result = getOverflowIds(tabs, widths, 200, 'a', 26);
    expect(result).toEqual(new Set(['c', 'd', 'e']));
  });

  test('handles null activeId', () => {
    const tabs = makeTabs('a', 'b', 'c');
    const widths = { a: 100, b: 100, c: 100 };
    // total = 300, area = 250 → overflow
    // available = 250 - 26 = 224
    // 'a' = 100 fits (124 left), 'b' = 100 fits (24 left), 'c' doesn't
    const result = getOverflowIds(tabs, widths, 250, null, 26);
    expect(result).toEqual(new Set(['c']));
  });

  test('handles missing tab widths gracefully', () => {
    const tabs = makeTabs('a', 'b', 'c');
    const widths = { a: 100 };
    // total = 100 + 0 + 0 = 100, area = 250 → all fit
    const result = getOverflowIds(tabs, widths, 250, 'a', 26);
    expect(result.size).toBe(0);
  });

  test('tabs with varying widths overflow correctly', () => {
    const tabs = makeTabs('a', 'b', 'c', 'd');
    const widths = { a: 50, b: 120, c: 60, d: 150 };
    // total = 380, area = 250 → overflow
    // active = 'b', available = 250 - 26 - 120 = 104
    // 'a' = 50 fits (54 left), 'c' = 60 doesn't, 'd' = 150 doesn't
    const result = getOverflowIds(tabs, widths, 250, 'b', 26);
    expect(result).toEqual(new Set(['c', 'd']));
  });

  test('only active tab visible when area is very narrow', () => {
    const tabs = makeTabs('a', 'b', 'c');
    const widths = { a: 100, b: 100, c: 100 };
    // total = 300, area = 130 → overflow
    // available = 130 - 26 = 104, active 'a' = 100 fits (4 left)
    // 'b' = 100 doesn't, 'c' = 100 doesn't
    const result = getOverflowIds(tabs, widths, 130, 'a', 26);
    expect(result).toEqual(new Set(['b', 'c']));
  });

  test('keeps the active tab visible (it shrinks) when there is room for a minimal chip', () => {
    const tabs = makeTabs('a', 'b', 'c');
    const widths = { a: 100, b: 100, c: 100 };
    // total = 300, area = 100 → overflow
    // available = 100 - 26 = 74 (≥ MIN_ACTIVE_TAB_WIDTH); active 'a' = 100 doesn't
    // fit but shrinks to fill it, leaving no room → 'b' and 'c' overflow
    const result = getOverflowIds(tabs, widths, 100, 'a', 26);
    expect(result.has('a')).toBe(false);
    expect(result).toEqual(new Set(['b', 'c']));
  });

  test('overflows the active tab too when there is no room for a minimal chip', () => {
    const tabs = makeTabs('a', 'b', 'c');
    const widths = { a: 100, b: 100, c: 100 };
    // total = 300, area = 50 → overflow
    // available = 50 - 26 = 24 (< MIN_ACTIVE_TAB_WIDTH); even a shrunk chip would be
    // clipped, so the active tab overflows too → all tabs overflow
    const result = getOverflowIds(tabs, widths, 50, 'a', 26);
    expect(result).toEqual(new Set(['a', 'b', 'c']));
  });

  test('keeps a single active tab visible (shrunk) when there is room for a minimal chip', () => {
    const tabs = makeTabs('a');
    const widths = { a: 100 };
    // total = 100, area = 80 → overflow; available = 54 (≥ MIN) → active shrinks, stays
    const result = getOverflowIds(tabs, widths, 80, 'a', 26);
    expect(result.size).toBe(0);
  });

  test('overflows the single active tab when there is no room for a minimal chip', () => {
    const tabs = makeTabs('a');
    const widths = { a: 100 };
    // total = 100, area = 30 → overflow; available = 4 (< MIN) → active overflows
    const result = getOverflowIds(tabs, widths, 30, 'a', 26);
    expect(result).toEqual(new Set(['a']));
  });

  test('respects custom overflowBtnSpace', () => {
    const tabs = makeTabs('a', 'b');
    const widths = { a: 100, b: 100 };
    // total = 200, area = 199 → overflow
    // available = 199 - 50 = 149, active 'a' = 100 fits (49 left)
    // 'b' = 100 doesn't fit
    const result = getOverflowIds(tabs, widths, 199, 'a', 50);
    expect(result).toEqual(new Set(['b']));
  });
});
