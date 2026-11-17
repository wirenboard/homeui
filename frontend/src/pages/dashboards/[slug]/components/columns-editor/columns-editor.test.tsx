// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { ColumnsEditor } from './columns-editor';

vi.mock('@/components/dropdown', () => ({
  Dropdown: ({ options, value, onChange }: any) => (
    <select
      data-testid="columns-dropdown"
      value={value ?? ''}
      onChange={(e) => {
        const val = e.target.value === '' ? null : Number(e.target.value);
        const opt = options.find((o: any) =>
          o.value === val || (o.value === null && val === null),
        );
        onChange(opt);
      }}
    >
      {options.map((o: any) => (
        <option key={String(o.value)} value={o.value ?? ''}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

const renderWidget = (id: string) => <div data-testid={`widget-${id}`}>{id}</div>;

describe('ColumnsEditor', () => {
  test('renders widgets from columns', () => {
    const columns = [['w1', 'w2'], ['w3']];
    render(
      <ColumnsEditor
        columns={columns}
        columnCount={2}
        maxColumns={4}
        renderWidget={renderWidget}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('w1')).toBeDefined();
    expect(screen.getByText('w2')).toBeDefined();
    expect(screen.getByText('w3')).toBeDefined();
  });

  test('renders correct number of droppable columns', () => {
    const columns = [['w1'], ['w2'], ['w3']];
    const { container } = render(
      <ColumnsEditor
        columns={columns}
        columnCount={3}
        maxColumns={4}
        renderWidget={renderWidget}
        onChange={vi.fn()}
      />,
    );
    const editorColumns = container.querySelectorAll('.columnsEditor-column');
    expect(editorColumns.length).toBe(3);
  });

  test('renders toolbar with columns label', () => {
    render(
      <ColumnsEditor
        columns={[['w1']]}
        columnCount={1}
        maxColumns={3}
        renderWidget={renderWidget}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('common.labels.columns:')).toBeDefined();
  });

  test('dropdown has Auto option plus numeric options up to maxColumns', () => {
    render(
      <ColumnsEditor
        columns={[['w1']]}
        columnCount={null}
        maxColumns={3}
        renderWidget={renderWidget}
        onChange={vi.fn()}
      />,
    );
    const dropdown = screen.getByTestId('columns-dropdown') as HTMLSelectElement;
    const options = Array.from(dropdown.options).map((o) => o.textContent);
    expect(options).toEqual(['common.labels.columns-auto', '1', '2', '3']);
  });

  test('dropdown reflects current columnCount value', () => {
    render(
      <ColumnsEditor
        columns={[['w1'], ['w2']]}
        columnCount={2}
        maxColumns={4}
        renderWidget={renderWidget}
        onChange={vi.fn()}
      />,
    );
    const dropdown = screen.getByTestId('columns-dropdown') as HTMLSelectElement;
    expect(dropdown.value).toBe('2');
  });

  test('dropdown shows empty value for Auto (null) columnCount', () => {
    render(
      <ColumnsEditor
        columns={[['w1'], ['w2']]}
        columnCount={null}
        maxColumns={4}
        renderWidget={renderWidget}
        onChange={vi.fn()}
      />,
    );
    const dropdown = screen.getByTestId('columns-dropdown') as HTMLSelectElement;
    expect(dropdown.value).toBe('');
  });

  test('redistributes items when columns count differs from effectiveColumnCount', () => {
    const columns = [['w1', 'w2', 'w3', 'w4']];
    const { container } = render(
      <ColumnsEditor
        columns={columns}
        columnCount={2}
        maxColumns={4}
        renderWidget={renderWidget}
        onChange={vi.fn()}
      />,
    );
    const editorColumns = container.querySelectorAll('.columnsEditor-column');
    expect(editorColumns.length).toBe(2);
    expect(editorColumns[0].textContent).toContain('w1');
    expect(editorColumns[0].textContent).toContain('w3');
    expect(editorColumns[1].textContent).toContain('w2');
    expect(editorColumns[1].textContent).toContain('w4');
  });

  test('uses maxColumns as effectiveColumnCount when columnCount is null', () => {
    const columns = [['w1', 'w2', 'w3']];
    const { container } = render(
      <ColumnsEditor
        columns={columns}
        columnCount={null}
        maxColumns={3}
        renderWidget={renderWidget}
        onChange={vi.fn()}
      />,
    );
    const editorColumns = container.querySelectorAll('.columnsEditor-column');
    expect(editorColumns.length).toBe(3);
  });

  test('calls onChange when columnCount exceeds maxColumns', () => {
    const onChange = vi.fn();
    render(
      <ColumnsEditor
        columns={[['w1', 'w2'], ['w3'], ['w4'], ['w5']]}
        columnCount={4}
        maxColumns={2}
        renderWidget={renderWidget}
        onChange={onChange}
      />,
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.any(Array),
      2,
    );
    const newColumns = onChange.mock.calls[0][0];
    expect(newColumns.length).toBe(2);
    expect(newColumns.flat().sort()).toEqual(['w1', 'w2', 'w3', 'w4', 'w5']);
  });

  test('calls onChange to redistribute when columnCount is null and columns length differs', () => {
    const onChange = vi.fn();
    render(
      <ColumnsEditor
        columns={[['w1', 'w2', 'w3']]}
        columnCount={null}
        maxColumns={3}
        renderWidget={renderWidget}
        onChange={onChange}
      />,
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.any(Array),
      null,
    );
    const newColumns = onChange.mock.calls[0][0];
    expect(newColumns.length).toBe(3);
  });

  test('does not call onChange when columns match effectiveColumnCount', () => {
    const onChange = vi.fn();
    render(
      <ColumnsEditor
        columns={[['w1'], ['w2'], ['w3']]}
        columnCount={3}
        maxColumns={4}
        renderWidget={renderWidget}
        onChange={onChange}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  test('renders each widget via renderWidget callback', () => {
    const custom = (id: string) => <span data-testid={`custom-${id}`}>Custom {id}</span>;
    render(
      <ColumnsEditor
        columns={[['a', 'b']]}
        columnCount={1}
        maxColumns={2}
        renderWidget={custom}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('custom-a')).toBeDefined();
    expect(screen.getByTestId('custom-b')).toBeDefined();
    expect(screen.getByText('Custom a')).toBeDefined();
  });

  test('renders items with columnsEditor-item class', () => {
    const { container } = render(
      <ColumnsEditor
        columns={[['w1', 'w2']]}
        columnCount={1}
        maxColumns={2}
        renderWidget={renderWidget}
        onChange={vi.fn()}
      />,
    );
    const items = container.querySelectorAll('.columnsEditor-item');
    expect(items.length).toBe(2);
  });
});
