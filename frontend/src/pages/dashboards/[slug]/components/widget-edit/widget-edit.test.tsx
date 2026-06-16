// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { WidgetEdit } from './widget-edit';

vi.mock('@/components/tooltip', () => ({ Tooltip: ({ children }: any) => <div>{children}</div> }));
vi.mock('react-sortablejs', () => ({
  ReactSortable: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value }: any) => <textarea data-testid="code-editor" defaultValue={value} />,
}));
vi.mock('@codemirror/lang-json', () => ({ json: () => [] }));
vi.mock('@/utils/id', () => ({ generateNextId: vi.fn(() => 'separator1') }));

const cells = new Map([
  ['dev/temp', { id: 'dev/temp', name: 'Temperature', type: 'number', extra: {} }],
  ['dev/sw', { id: 'dev/sw', name: 'Switch', type: 'switch', extra: {} }],
]);

function makeWidget(overrides: any = {}) {
  return {
    id: 'w1',
    name: 'Test Widget',
    description: 'Desc',
    compact: false,
    cells: [
      { id: 'dev/temp', name: 'Temp', type: 'number', extra: {} },
    ],
    associatedDashboards: [],
    ...overrides,
  } as any;
}

describe('WidgetEdit', () => {
  test('renders nothing when closed', () => {
    render(
      <WidgetEdit
        widget={makeWidget()}
        cells={cells}
        topics={[]}
        isOpened={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText('widget.labels.edit')).toBeNull();
  });

  test('renders edit heading for existing widget', () => {
    render(
      <WidgetEdit
        widget={makeWidget()}
        cells={cells}
        topics={[]}
        isOpened={true}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('widget.labels.edit Test Widget')).toBeDefined();
  });

  test('renders create heading for new widget', () => {
    render(
      <WidgetEdit
        widget={makeWidget({ id: '' })}
        cells={cells}
        topics={[]}
        isOpened={true}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('widget.labels.create')).toBeDefined();
  });

  test('renders name input with widget name', () => {
    render(
      <WidgetEdit
        widget={makeWidget()}
        cells={cells}
        topics={[]}
        isOpened={true}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const nameInput = screen.getByLabelText('widget.labels.name') as HTMLInputElement;
    expect(nameInput.value).toBe('Test Widget');
  });

  test('renders description textarea', () => {
    render(
      <WidgetEdit
        widget={makeWidget()}
        cells={cells}
        topics={[]}
        isOpened={true}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('widget.labels.description')).toBeDefined();
  });

  test('renders cell list with ids', () => {
    render(
      <WidgetEdit
        widget={makeWidget()}
        cells={cells}
        topics={[]}
        isOpened={true}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('dev/temp')).toBeDefined();
  });

  test('renders cell type', () => {
    render(
      <WidgetEdit
        widget={makeWidget()}
        cells={cells}
        topics={[]}
        isOpened={true}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('number')).toBeDefined();
  });

  test('renders compact toggle', () => {
    render(
      <WidgetEdit
        widget={makeWidget()}
        cells={cells}
        topics={[]}
        isOpened={true}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />);
    expect(screen.getByText('widget.labels.compact')).toBeDefined();
  });

  test('calls onSave with widget data on confirm', () => {
    const onSave = vi.fn();
    render(
      <WidgetEdit
        widget={makeWidget()}
        cells={cells}
        topics={[]}
        isOpened={true}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('widget.buttons.save'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Widget',
      id: 'w1',
    }));
  });

  test('calls onClose on cancel', () => {
    const onClose = vi.fn();
    render(
      <WidgetEdit
        widget={makeWidget()}
        cells={cells}
        topics={[]}
        isOpened={true}
        onSave={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText('modal.labels.cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  test('renders delete buttons for cells', () => {
    render(
      <WidgetEdit
        widget={makeWidget()}
        cells={cells}
        topics={[]}
        isOpened={true}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('widget.buttons.delete-control')).toBeDefined();
  });

  test('renders json toggle button', () => {
    render(
      <WidgetEdit
        widget={makeWidget()}
        cells={cells}
        topics={[]}
        isOpened={true}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('widget.buttons.edit-json')).toBeDefined();
  });

  test('shows warning when widget used in multiple dashboards', () => {
    const widget = makeWidget({
      associatedDashboards: [{ id: 'd1', name: 'Dash A' }, { id: 'd2', name: 'Dash B' }],
    });
    render(<WidgetEdit widget={widget} cells={cells} topics={[]} isOpened={true} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('widget.labels.warning')).toBeDefined();
    expect(screen.getByText('Dash A')).toBeDefined();
    expect(screen.getByText('Dash B')).toBeDefined();
  });

  test('shows invert column when switch cells present', () => {
    const widget = makeWidget({
      cells: [{ id: 'dev/sw', name: 'SW', type: 'switch', extra: {} }],
    });
    render(<WidgetEdit widget={widget} cells={cells} topics={[]} isOpened={true} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('widget.labels.invert')).toBeDefined();
  });

  test('shows incomplete for cells not in cells map', () => {
    const widget = makeWidget({
      cells: [{ id: 'missing/ctrl', name: 'Missing', type: '', extra: {} }],
    });
    render(<WidgetEdit widget={widget} cells={cells} topics={[]} isOpened={true} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('incomplete')).toBeDefined();
  });
});
