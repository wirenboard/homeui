// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { useStore } from './use-store';

describe('useStore', () => {
  test('creates store from factory on first render', () => {
    const factory = vi.fn(() => ({ value: 42 }));
    const { result } = renderHook(() => useStore(factory));

    expect(result.current).toEqual({ value: 42 });
    expect(factory).toHaveBeenCalledOnce();
  });

  test('returns same instance on re-render', () => {
    const factory = vi.fn(() => ({ value: 42 }));
    const { result, rerender } = renderHook(() => useStore(factory));

    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    expect(factory).toHaveBeenCalledOnce();
  });
});
