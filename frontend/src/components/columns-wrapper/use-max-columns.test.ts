// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { useMaxColumns, MIN_COLUMN_WIDTH } from './use-max-columns';

let resizeCallbacks: Set<() => void>;
const observeMock = vi.fn();
const disconnectMock = vi.fn();

beforeEach(() => {
  resizeCallbacks = new Set();
  observeMock.mockClear();
  disconnectMock.mockClear();

  vi.stubGlobal('ResizeObserver', class {
    constructor(cb: () => void) {
      resizeCallbacks.add(cb);
    }
    observe = observeMock;
    disconnect = disconnectMock;
  });
});

function createMockRef(width: number) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: width, configurable: true });
  return { current: el };
}

function setRefWidth(ref: { current: HTMLElement }, width: number) {
  Object.defineProperty(ref.current, 'clientWidth', { value: width, configurable: true });
  act(() => {
    resizeCallbacks.forEach((cb) => cb());
  });
}

describe('useMaxColumns', () => {
  test('exports MIN_COLUMN_WIDTH constant', () => {
    expect(MIN_COLUMN_WIDTH).toBe(320);
  });

  test('calculates columns from container width and default minColumnWidth', () => {
    const ref = createMockRef(960);
    const { result } = renderHook(() => useMaxColumns(ref as any, true));
    expect(result.current).toBe(3);
  });

  test('returns 1 when container is narrower than minColumnWidth', () => {
    const ref = createMockRef(200);
    const { result } = renderHook(() => useMaxColumns(ref as any, true));
    expect(result.current).toBe(1);
  });

  test('uses custom minColumnWidth', () => {
    const ref = createMockRef(900);
    const { result } = renderHook(() => useMaxColumns(ref as any, true, 300));
    expect(result.current).toBe(3);
  });

  test('floors the column count', () => {
    const ref = createMockRef(700);
    const { result } = renderHook(() => useMaxColumns(ref as any, true));
    // 700 / 320 = 2.18 → floor = 2
    expect(result.current).toBe(2);
  });

  test('updates on resize', () => {
    const ref = createMockRef(960);
    const { result } = renderHook(() => useMaxColumns(ref as any, true));
    expect(result.current).toBe(3);

    setRefWidth(ref, 1600);
    expect(result.current).toBe(5);
  });

  test('attaches and disconnects ResizeObserver', () => {
    const ref = createMockRef(960);
    const { unmount } = renderHook(() => useMaxColumns(ref as any, true));
    expect(observeMock).toHaveBeenCalled();

    unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });

  test('recalculates when hasContent changes', () => {
    const ref = createMockRef(960);
    const { result, rerender } = renderHook(
      ({ hasContent }) => useMaxColumns(ref as any, hasContent),
      { initialProps: { hasContent: false } },
    );
    expect(result.current).toBe(3);

    Object.defineProperty(ref.current, 'clientWidth', { value: 1280, configurable: true });
    rerender({ hasContent: true });
    expect(result.current).toBe(4);
  });
});
