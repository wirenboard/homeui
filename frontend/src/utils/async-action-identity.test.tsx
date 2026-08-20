// @vitest-environment happy-dom
// The execute function must keep one identity for the component's
// lifetime even when the wrapped action is an inline function (a new one
// per render), and must always run the latest one - consumers pass it
// down as a prop and hang effects off it (e.g. the code editor's
// extension stack).
import { renderHook, act } from '@testing-library/react';
import { useAsyncAction } from './async-action';

describe('useAsyncAction identity', () => {
  test('execute keeps its identity across rerenders with a new inline function and calls the latest one', async () => {
    vi.useFakeTimers();
    const first = vi.fn(async () => 'first');
    const second = vi.fn(async () => 'second');
    const { result, rerender } = renderHook(
      ({ fn }) => useAsyncAction(fn),
      { initialProps: { fn: first } },
    );
    const execute = result.current[0];

    rerender({ fn: second });
    expect(result.current[0]).toBe(execute);

    let value: string | undefined;
    await act(async () => {
      const promise = result.current[0]();
      await vi.advanceTimersByTimeAsync(300);
      value = await promise;
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(value).toBe('second');
    vi.useRealTimers();
  });
});
