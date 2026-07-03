// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { useAsyncAction } from './async-action';

describe('useAsyncAction', () => {
  test('returns execute function and isLoading=false initially', () => {
    const fn = vi.fn(async () => 'done');
    const { result } = renderHook(() => useAsyncAction(fn));

    expect(typeof result.current[0]).toBe('function');
    expect(result.current[1]).toBe(false);
  });

  test('sets isLoading=true during execution', async () => {
    vi.useFakeTimers();
    let resolveFn: () => void;
    const fn = vi.fn(() => new Promise<void>((r) => {
      resolveFn = r;
    }));
    const { result } = renderHook(() => useAsyncAction(fn));

    await act(async () => {
      result.current[0]();
      await Promise.resolve();
    });
    expect(result.current[1]).toBe(true);

    await act(async () => {
      resolveFn!();
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current[1]).toBe(false);
    vi.useRealTimers();
  });

  test('returns the result of the wrapped function', async () => {
    vi.useFakeTimers();
    const fn = vi.fn(async (x: number) => x * 2);
    const { result } = renderHook(() => useAsyncAction(fn));

    let value: number | undefined;
    await act(async () => {
      const promise = result.current[0](5);
      await vi.advanceTimersByTimeAsync(300);
      value = await promise;
    });
    expect(value).toBe(10);
    vi.useRealTimers();
  });

  test('resets isLoading on error', async () => {
    vi.useFakeTimers();
    const fn = vi.fn(async () => {
      throw new Error('fail');
    });
    const { result } = renderHook(() => useAsyncAction(fn));

    await act(async () => {
      const promise = result.current[0]();
      promise.catch(() => {});
      await vi.advanceTimersByTimeAsync(300);
      try {
        await promise;
      } catch { /* expected */ }
    });
    expect(result.current[1]).toBe(false);
    vi.useRealTimers();
  });
});
