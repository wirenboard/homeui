// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { WidgetAdd } from './widget-add';

vi.mock('@/components/tooltip', () => ({ Tooltip: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/cell', () => ({
  Cell: () => <div data-testid="cell" />,
}));
vi.mock('../widget-delete', () => ({ WidgetDelete: () => null }));
vi.mock('../widget-edit', () => ({ WidgetEdit: () => null }));
vi.mock('@/stores/dashboards', () => ({
  Widget: class {
    constructor(data: any) {
      Object.assign(this, data);
    } save = vi.fn();
  },
}));

function makeWidgets() {
  return new Map([
    ['w1', {
      id: 'w1', name: 'Widget A', description: 'Desc A',
      cells: [{ id: 'dev/a', name: 'A', type: 'text' }],
      compact: false,
      copy: vi.fn(() => 'w1-copy'),
      delete: vi.fn(),
    }],
    ['w2', {
      id: 'w2', name: 'Widget B', description: '',
      cells: [{ id: 'dev/b', name: 'B', type: 'switch' }],
      compact: false,
      copy: vi.fn(() => 'w2-copy'),
      delete: vi.fn(),
    }],
  ]) as any;
}

function makeDashboard() {
  return {
    id: 'dash1', name: 'Dashboard',
    hasWidget: vi.fn((id: string) => id === 'w1'),
    addWidget: vi.fn(),
  } as any;
}

describe('WidgetAdd', () => {
  test('renders nothing when not opened', () => {
    render(
      <WidgetAdd
        widgets={makeWidgets()}
        dashboard={makeDashboard()}
        cells={new Map()}
        topics={[]}
        isOpened={false}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText('widget.labels.add')).toBeNull();
  });

  test('renders dialog with widget list', () => {
    render(
      <WidgetAdd
        widgets={makeWidgets()}
        dashboard={makeDashboard()}
        cells={new Map()}
        topics={[]}
        isOpened={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('widget.labels.add')).toBeDefined();
    expect(screen.getAllByText('Widget A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Widget B').length).toBeGreaterThanOrEqual(1);
  });

  test('shows create widget button', () => {
    render(
      <WidgetAdd
        widgets={makeWidgets()}
        dashboard={makeDashboard()}
        cells={new Map()}
        topics={[]}
        isOpened={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('widget.buttons.create-widget')).toBeDefined();
  });

  test('shows preview heading', () => {
    render(
      <WidgetAdd
        widgets={makeWidgets()}
        dashboard={makeDashboard()}
        cells={new Map()}
        topics={[]}
        isOpened={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('widget.labels.preview')).toBeDefined();
  });

  test('shows "exists on dashboard" for already-added widget', () => {
    render(
      <WidgetAdd
        widgets={makeWidgets()}
        dashboard={makeDashboard()}
        cells={new Map()}
        topics={[]}
        isOpened={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('widget.buttons.exists-on-dashboard')).toBeDefined();
  });

  test('shows description when widget has one', () => {
    render(
      <WidgetAdd
        widgets={makeWidgets()}
        dashboard={makeDashboard()}
        cells={new Map()}
        topics={[]}
        isOpened={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Desc A')).toBeDefined();
  });
});
