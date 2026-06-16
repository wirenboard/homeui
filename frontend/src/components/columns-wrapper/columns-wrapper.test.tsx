// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { ColumnsWrapper } from './columns-wrapper';

const observeMock = vi.fn();
const disconnectMock = vi.fn();

vi.stubGlobal('ResizeObserver', class {
  observe = observeMock;
  unobserve = vi.fn();
  disconnect = disconnectMock;
});

describe('ColumnsWrapper', () => {
  test('renders children distributed into columns', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={200}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
      </ColumnsWrapper>,
    );
    const columns = container.querySelectorAll('.columnsWrapper-column');
    expect(columns.length).toBeGreaterThanOrEqual(1);
  });

  test('applies columnClassName to each column', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={200} columnClassName="my-col">
        <div>A</div>
      </ColumnsWrapper>,
    );
    const columns = container.querySelectorAll('.my-col');
    expect(columns.length).toBeGreaterThanOrEqual(1);
  });

  test('attaches ResizeObserver', () => {
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

  test('renders all children content', () => {
    const { container } = render(
      <ColumnsWrapper baseColumnWidth={100}>
        <span>Item1</span>
        <span>Item2</span>
        <span>Item3</span>
      </ColumnsWrapper>,
    );
    expect(container.textContent).toContain('Item1');
    expect(container.textContent).toContain('Item2');
    expect(container.textContent).toContain('Item3');
  });
});
