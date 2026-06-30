// @vitest-environment happy-dom
import { render, act } from '@testing-library/react';
import { ColumnsWrapper } from './columns-wrapper';

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

function setContainerWidth(container: HTMLElement, width: number) {
  const wrapper = container.querySelector('.columnsWrapper-container') as HTMLElement;
  Object.defineProperty(wrapper, 'clientWidth', { value: width, configurable: true });
  act(() => {
    resizeCallbacks.forEach((cb) => cb());
  });
}

describe('ColumnsWrapper', () => {
  test('renders children into columns', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={200}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
      </ColumnsWrapper>,
    );
    setContainerWidth(container, 600);
    const columns = container.querySelectorAll('.columnsWrapper-column');
    expect(columns.length).toBe(3);
  });

  test('calculates column count from container width', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={300}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
        <div>D</div>
      </ColumnsWrapper>,
    );
    setContainerWidth(container, 900);
    expect(container.querySelectorAll('.columnsWrapper-column').length).toBe(3);

    setContainerWidth(container, 600);
    expect(container.querySelectorAll('.columnsWrapper-column').length).toBe(2);
  });

  test('minimum column count is 1', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={500}>
        <div>A</div>
        <div>B</div>
      </ColumnsWrapper>,
    );
    setContainerWidth(container, 100);
    expect(container.querySelectorAll('.columnsWrapper-column').length).toBe(1);
  });

  test('uses explicit columnCount when provided', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={200} columnCount={2}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
        <div>D</div>
      </ColumnsWrapper>,
    );
    setContainerWidth(container, 1000);
    expect(container.querySelectorAll('.columnsWrapper-column').length).toBe(2);
  });

  test('explicit columnCount=1 creates a single column', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={200} columnCount={1}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
      </ColumnsWrapper>,
    );
    setContainerWidth(container, 1000);
    const columns = container.querySelectorAll('.columnsWrapper-column');
    expect(columns.length).toBe(1);
    expect(columns[0].textContent).toContain('A');
    expect(columns[0].textContent).toContain('B');
    expect(columns[0].textContent).toContain('C');
  });

  test('distributes children round-robin across columns', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={200} columnCount={2}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
        <div>D</div>
      </ColumnsWrapper>,
    );
    setContainerWidth(container, 600);
    const columns = container.querySelectorAll('.columnsWrapper-column');
    expect(columns[0].textContent).toContain('A');
    expect(columns[0].textContent).toContain('C');
    expect(columns[1].textContent).toContain('B');
    expect(columns[1].textContent).toContain('D');
  });

  test('sets grid-template-columns inline style', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={300} columnCount={3}>
        <div>A</div>
      </ColumnsWrapper>,
    );
    setContainerWidth(container, 900);
    const wrapper = container.querySelector('.columnsWrapper-container') as HTMLElement;
    expect(wrapper.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
  });

  test('updates grid style when column count changes', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={300}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
      </ColumnsWrapper>,
    );
    setContainerWidth(container, 900);
    const wrapper = container.querySelector('.columnsWrapper-container') as HTMLElement;
    expect(wrapper.style.gridTemplateColumns).toBe('repeat(3, 1fr)');

    setContainerWidth(container, 600);
    expect(wrapper.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
  });

  test('applies columnClassName to each column', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={300} columnClassName="my-col" columnCount={2}>
        <div>A</div>
        <div>B</div>
      </ColumnsWrapper>,
    );
    setContainerWidth(container, 600);
    const columns = container.querySelectorAll('.my-col');
    expect(columns.length).toBe(2);
    columns.forEach((col) => {
      expect(col.classList.contains('columnsWrapper-column')).toBe(true);
    });
  });

  test('attaches ResizeObserver on mount', () => {
    render(
      <ColumnsWrapper baseColumnWidth={200}>
        <div>A</div>
      </ColumnsWrapper>,
    );
    expect(observeMock).toHaveBeenCalled();
  });

  test('disconnects ResizeObserver on unmount', () => {
    const { unmount } = render(
      <ColumnsWrapper baseColumnWidth={200}>
        <div>A</div>
      </ColumnsWrapper>,
    );
    unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });

  test('recalculates on resize', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={200}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
      </ColumnsWrapper>,
    );
    setContainerWidth(container, 600);
    expect(container.querySelectorAll('.columnsWrapper-column').length).toBe(3);

    setContainerWidth(container, 400);
    expect(container.querySelectorAll('.columnsWrapper-column').length).toBe(2);
  });

  test('scrollbar compensation keeps column count when shrink is within threshold', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={300}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
      </ColumnsWrapper>,
    );
    setContainerWidth(container, 900);
    expect(container.querySelectorAll('.columnsWrapper-column').length).toBe(3);

    // Shrink by less than scrollbar width (20px) — should stay at 3
    setContainerWidth(container, 895);
    expect(container.querySelectorAll('.columnsWrapper-column').length).toBe(3);
  });

  test('does not compensate when shrink exceeds scrollbar threshold', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={300}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
      </ColumnsWrapper>,
    );
    setContainerWidth(container, 900);
    expect(container.querySelectorAll('.columnsWrapper-column').length).toBe(3);

    // Shrink well past scrollbar width
    setContainerWidth(container, 500);
    expect(container.querySelectorAll('.columnsWrapper-column').length).toBe(1);
  });

  describe('columnItems', () => {
    test('renders pre-arranged column items', () => {
      const items = [
        [<div key="a">Col1-A</div>, <div key="b">Col1-B</div>],
        [<div key="c">Col2-A</div>],
      ];
      const { container } = render(
        <ColumnsWrapper baseColumnWidth={200} columnItems={items} columnCount={2} />,
      );
      setContainerWidth(container, 600);
      const columns = container.querySelectorAll('.columnsWrapper-column');
      expect(columns.length).toBe(2);
      expect(columns[0].textContent).toContain('Col1-A');
      expect(columns[0].textContent).toContain('Col1-B');
      expect(columns[1].textContent).toContain('Col2-A');
    });

    test('merges columnItems when there are more columns than maxCount', () => {
      const items = [
        [<div key="a">A</div>],
        [<div key="b">B</div>],
        [<div key="c">C</div>],
        [<div key="d">D</div>],
      ];
      const { container } = render(
        <ColumnsWrapper baseColumnWidth={200} columnItems={items} columnCount={2} />,
      );
      setContainerWidth(container, 600);
      const columns = container.querySelectorAll('.columnsWrapper-column');
      expect(columns.length).toBe(2);
      expect(columns[0].textContent).toContain('A');
      expect(columns[0].textContent).toContain('C');
      expect(columns[1].textContent).toContain('B');
      expect(columns[1].textContent).toContain('D');
    });

    test('preserves column arrangement when items fit in maxCount', () => {
      const items = [
        [<div key="a">A</div>],
        [<div key="b">B</div>],
      ];
      const { container } = render(
        <ColumnsWrapper baseColumnWidth={200} columnItems={items} columnCount={3} />,
      );
      setContainerWidth(container, 900);
      const columns = container.querySelectorAll('.columnsWrapper-column');
      expect(columns.length).toBe(2);
      expect(columns[0].textContent).toBe('A');
      expect(columns[1].textContent).toBe('B');
    });
  });
});
