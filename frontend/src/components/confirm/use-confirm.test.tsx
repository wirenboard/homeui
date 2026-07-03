// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { useConfirm } from './use-confirm';

describe('useConfirm', () => {
  test('starts closed', () => {
    const { result } = renderHook(() => useConfirm());
    const [, isOpened] = result.current;
    expect(isOpened).toBe(false);
  });

  test('confirm opens dialog and returns promise', async () => {
    const { result } = renderHook(() => useConfirm());

    let promise: Promise<any>;
    act(() => {
      promise = (result.current[0] as any)();
    });
    expect(result.current[1]).toBe(true);

    act(() => {
      (result.current[2] as any)(true);
    });
    const value = await promise!;
    expect(value).toBe(true);
    expect(result.current[1]).toBe(false);
  });

  test('handleClose resolves with null', async () => {
    const { result } = renderHook(() => useConfirm());

    let promise: Promise<any>;
    act(() => {
      promise = (result.current[0] as any)();
    });

    act(() => {
      (result.current[3] as any)(null);
    });
    const value = await promise!;
    expect(value).toBeNull();
    expect(result.current[1]).toBe(false);
  });

  test('confirm passes payload', async () => {
    const { result } = renderHook(() => useConfirm<string>());

    act(() => {
      (result.current[0] as any)('my-data');
    });
    expect(result.current[4]).toBe('my-data');
  });
});
