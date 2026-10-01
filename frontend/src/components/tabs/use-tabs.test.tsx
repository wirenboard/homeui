// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { useTabs } from './use-tabs';

function makeItems() {
  return [
    { id: 'tab1', label: 'First' },
    { id: 'tab2', label: 'Second' },
    { id: 'tab3', label: 'Third' },
  ];
}

describe('useTabs', () => {
  test('uses defaultTab when provided', () => {
    const { result } = renderHook(() => useTabs({ items: makeItems(), defaultTab: 'tab2' }));
    expect(result.current.activeTab).toBe('tab2');
  });

  test('onTabChange updates activeTab', async () => {
    const items = makeItems();
    const { result } = renderHook(() => useTabs({ items, defaultTab: 'tab1' }));

    await act(async () => {
      await result.current.onTabChange('tab3');
    });
    expect(result.current.activeTab).toBe('tab3');
  });

  test('onBeforeTabChange can prevent change', async () => {
    const items = makeItems();
    const beforeChange = vi.fn(() => false);
    const { result } = renderHook(() =>
      useTabs({ items, defaultTab: 'tab1', onBeforeTabChange: beforeChange }),
    );

    await act(async () => {
      await result.current.onTabChange('tab2');
    });
    expect(result.current.activeTab).toBe('tab1');
  });

  test('onAfterTabChange is called after change', async () => {
    const items = makeItems();
    const afterChange = vi.fn();
    const { result } = renderHook(() =>
      useTabs({ items, defaultTab: 'tab1', onAfterTabChange: afterChange }),
    );

    await act(async () => {
      await result.current.onTabChange('tab2');
    });
    expect(afterChange).toHaveBeenCalledWith('tab2', 'tab1');
  });

  test('falls back when activeTab removed from items', () => {
    let items = makeItems();
    const { result, rerender } = renderHook(
      ({ items: itms }) => useTabs({ items: itms, defaultTab: 'tab1' }),
      { initialProps: { items } },
    );
    expect(result.current.activeTab).toBe('tab1');

    items = [{ id: 'tab2', label: 'Second' }, { id: 'tab3', label: 'Third' }];
    rerender({ items });
    expect(['tab2', 'tab3']).toContain(result.current.activeTab);
  });
});
