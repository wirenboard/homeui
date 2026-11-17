// @vitest-environment happy-dom
import { authStoreMock } from '@/test/mocks/auth-store';
import { render, screen, fireEvent, act } from '@/test/render';
import WidgetsPage from './widgets';

const { dashStore, deviceStore } = vi.hoisted(() => ({
  dashStore: {
    widgets: new Map<string, any>(),
    dashboards: new Map<string, any>([
      ['d2', { id: 'd2', name: 'Dashboard 2', addWidget: vi.fn() }],
    ]),
    isLoading: false,
    isShowWidgetsPage: true,
    deleteWidget: vi.fn(),
  },
  deviceStore: {
    cells: new Map<string, any>([
      ['dev/ctrl', { id: 'dev/ctrl', name: 'Ctrl', value: '42', type: 'text' }],
    ]),
    topicsWithoutSystem: [],
  },
}));

let widgetEditProps: any = null;
let widgetDeleteProps: any = null;

vi.mock('@/components/tooltip', () => import('@/test/mocks/tooltip'));
vi.mock('@/components/dropdown', () => import('@/test/mocks/dropdown'));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ children, title, actions, errors }: any) => (
    <div>
      <h1>{title}</h1>
      <div data-testid="actions">{actions}</div>
      {errors?.map((e: any, i: number) => (
        <div key={i} data-testid="page-error">
          {e.text}
          {e.onClose && <button data-testid="close-error" onClick={e.onClose}>close</button>}
        </div>
      ))}
      {children}
    </div>
  ),
}));
vi.mock('@/components/table', () => ({
  Table: ({ children }: any) => <table><tbody>{children}</tbody></table>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));
vi.mock('@/components/card', () => ({
  Card: ({ children, heading }: any) => (
    <div data-testid="widget-card"><h3>{heading}</h3>{children}</div>
  ),
}));
vi.mock('@/components/cell', () => ({
  Cell: ({ name }: any) => <div data-testid="cell">{name}</div>,
  CellHistory: () => <div data-testid="cell-history" />,
}));
vi.mock('@/pages/dashboards/[slug]', () => ({
  WidgetEdit: (props: any) => {
    widgetEditProps = props;
    return props.isOpened ? <div data-testid="widget-edit" /> : null;
  },
  WidgetDelete: (props: any) => {
    widgetDeleteProps = props;
    return props.isOpened ? <div data-testid="widget-delete" /> : null;
  },
}));
vi.mock('@/stores/dashboards', () => ({
  dashboardsStore: dashStore,
  Widget: class {
    save = vi.fn();
  },
}));
vi.mock('@/stores/devices', () => ({ devicesStore: deviceStore }));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));

function makeWidget(overrides: Record<string, any> = {}) {
  return {
    id: 'w1', name: 'Widget One', description: 'Test widget',
    cells: [
      { id: 'dev/ctrl', name: 'Ctrl', type: 'text' },
      { id: 'missing', name: 'Gone', type: 'value' },
      { id: 'sep', name: 'Section', type: 'separator' },
    ],
    compact: false, save: vi.fn(),
    associatedDashboards: [{ id: 'd1', name: 'Dashboard 1' }],
    notUsedDashboards: [{ id: 'd2', name: 'Dashboard 2' }],
    ...overrides,
  };
}

function renderPage() {
  widgetEditProps = null;
  widgetDeleteProps = null;
  return render(<WidgetsPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
  authStoreMock.hasRights.mockReturnValue(true);
  dashStore.isShowWidgetsPage = true;
  dashStore.isLoading = false;
  dashStore.widgets.clear();
  dashStore.widgets.set('w1', makeWidget());
  dashStore.dashboards.get('d2')!.addWidget = vi.fn();
  localStorage.removeItem('hide-widgets-alert');
});

describe('WidgetsPage', () => {
  describe('rendering', () => {
    test('renders page title', () => {
      renderPage();
      expect(screen.getByText('widgets.title')).toBeDefined();
    });

    test('renders widget name and description', () => {
      renderPage();
      expect(screen.getByText('Widget One')).toBeDefined();
      expect(screen.getByText('Test widget')).toBeDefined();
    });

    test('renders cell names in list view', () => {
      renderPage();
      expect(screen.getAllByText('Ctrl').length).toBeGreaterThanOrEqual(1);
    });

    test('renders cell types in list view', () => {
      renderPage();
      expect(screen.getByText('text')).toBeDefined();
    });

    test('renders associated dashboard links', () => {
      renderPage();
      const link = screen.getByText('Dashboard 1');
      expect(link.closest('a')).toBeDefined();
      expect(link.closest('a')?.getAttribute('href')).toBe('/dashboards/d1');
    });

    test('shows empty message when no widgets', () => {
      dashStore.widgets.clear();
      renderPage();
      expect(screen.getByText('widgets.errors.empty')).toBeDefined();
    });

    test('hides table when no widgets', () => {
      dashStore.widgets.clear();
      renderPage();
      expect(document.querySelector('table')).toBeNull();
    });

    test('skips errors when loading', () => {
      dashStore.isLoading = true;
      dashStore.isShowWidgetsPage = false;
      dashStore.widgets.clear();
      renderPage();
      expect(screen.queryByTestId('page-error')).toBeNull();
      expect(screen.queryByText('widgets.errors.empty')).toBeNull();
    });

    test('renders multiple widgets', () => {
      dashStore.widgets.set('w2', makeWidget({
        id: 'w2', name: 'Widget Two', description: 'Second',
        cells: [{ id: 'dev/ctrl', name: 'Ctrl', type: 'text' }],
        associatedDashboards: [], notUsedDashboards: [],
      }));
      renderPage();
      expect(screen.getByText('Widget One')).toBeDefined();
      expect(screen.getByText('Widget Two')).toBeDefined();
      expect(screen.getByText('Second')).toBeDefined();
    });

    test('shows hidden page alert when not visible', () => {
      dashStore.isShowWidgetsPage = false;
      renderPage();
      expect(screen.getByTestId('page-error')).toBeDefined();
    });

    test('dismissing alert saves to localStorage', () => {
      dashStore.isShowWidgetsPage = false;
      renderPage();
      fireEvent.click(screen.getByTestId('close-error'));
      expect(localStorage.getItem('hide-widgets-alert')).toBe('true');
    });

    test('does not show hidden alert if previously dismissed', () => {
      localStorage.setItem('hide-widgets-alert', 'true');
      dashStore.isShowWidgetsPage = false;
      renderPage();
      expect(screen.queryByTestId('page-error')).toBeNull();
    });
  });

  describe('view toggle', () => {
    test('shows toggle button when widgets exist', () => {
      renderPage();
      expect(screen.getByLabelText('widgets.buttons.widget-view')).toBeDefined();
    });

    test('hides toggle when no widgets', () => {
      dashStore.widgets.clear();
      renderPage();
      expect(screen.queryByLabelText('widgets.buttons.widget-view')).toBeNull();
    });

    test('switches to card view on click', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('widgets.buttons.widget-view'));
      expect(screen.getByLabelText('widgets.buttons.table-view')).toBeDefined();
    });

    test('card view shows preview card', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('widgets.buttons.widget-view'));
      expect(screen.getByTestId('widget-card')).toBeDefined();
    });

    test('card view hides list-specific columns', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('widgets.buttons.widget-view'));
      expect(screen.queryByText('widgets.labels.cells')).toBeNull();
      expect(screen.queryByText('widgets.labels.types')).toBeNull();
      expect(screen.queryByText('widgets.labels.values')).toBeNull();
      expect(screen.queryByText('widgets.labels.graph')).toBeNull();
    });

    test('card view shows preview column header', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('widgets.buttons.widget-view'));
      expect(screen.getByText('widgets.labels.preview')).toBeDefined();
    });

    test('list view shows column headers', () => {
      renderPage();
      expect(screen.getByText('widgets.labels.cells')).toBeDefined();
      expect(screen.getByText('widgets.labels.types')).toBeDefined();
      expect(screen.getByText('widgets.labels.values')).toBeDefined();
      expect(screen.getByText('widgets.labels.graph')).toBeDefined();
    });

    test('switches back from card to list view', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('widgets.buttons.widget-view'));
      expect(screen.queryByText('widgets.labels.cells')).toBeNull();
      fireEvent.click(screen.getByLabelText('widgets.buttons.table-view'));
      expect(screen.getByText('widgets.labels.cells')).toBeDefined();
      expect(screen.queryByTestId('widget-card')).toBeNull();
    });
  });

  describe('card view cells', () => {
    function switchToCardView() {
      renderPage();
      fireEvent.click(screen.getByLabelText('widgets.buttons.widget-view'));
    }

    test('renders Cell for existing cells', () => {
      switchToCardView();
      expect(screen.getByTestId('cell')).toBeDefined();
    });

    test('renders separator', () => {
      switchToCardView();
      expect(document.querySelector('.dashboard-separator')).not.toBeNull();
      expect(screen.getByText('Section')).toBeDefined();
    });

    test('shows fallback for missing cells', () => {
      switchToCardView();
      expect(screen.getByText('Gone')).toBeDefined();
    });
  });

  describe('add to dashboard', () => {
    test('shows dropdown with unused dashboards', () => {
      renderPage();
      expect(screen.getByText('widgets.buttons.add')).toBeDefined();
      expect(screen.getByText('Dashboard 2')).toBeDefined();
    });

    test('selecting dashboard adds widget', () => {
      renderPage();
      fireEvent.click(screen.getByText('Dashboard 2'));
      expect(dashStore.dashboards.get('d2')!.addWidget).toHaveBeenCalledWith('w1');
    });

    test('hides dropdown without edit rights', () => {
      authStoreMock.hasRights.mockReturnValue(false);
      renderPage();
      expect(screen.queryByText('widgets.buttons.add')).toBeNull();
    });

    test('hides dropdown when no unused dashboards', () => {
      dashStore.widgets.set('w1', makeWidget({ notUsedDashboards: [] }));
      renderPage();
      expect(screen.queryByText('widgets.buttons.add')).toBeNull();
    });
  });

  describe('edit widget', () => {
    test('clicking edit opens WidgetEdit', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('widget.buttons.edit'));
      expect(screen.getByTestId('widget-edit')).toBeDefined();
      expect(widgetEditProps.widget).toBe(dashStore.widgets.get('w1'));
    });

    test('onSave calls widget.save and closes', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('widget.buttons.edit'));
      const data = { name: 'Updated' };
      act(() => {
        widgetEditProps.onSave(data);
      });
      expect(dashStore.widgets.get('w1')!.save).toHaveBeenCalledWith(data);
      expect(screen.queryByTestId('widget-edit')).toBeNull();
    });

    test('onClose hides editor', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('widget.buttons.edit'));
      act(() => {
        widgetEditProps.onClose();
      });
      expect(screen.queryByTestId('widget-edit')).toBeNull();
    });
  });

  describe('delete widget', () => {
    test('clicking delete opens WidgetDelete', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('widget.buttons.delete'));
      expect(screen.getByTestId('widget-delete')).toBeDefined();
      expect(widgetDeleteProps.name).toBe('Widget One');
    });

    test('onDelete calls deleteWidget and closes', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('widget.buttons.delete'));
      act(() => {
        widgetDeleteProps.onDelete();
      });
      expect(dashStore.deleteWidget).toHaveBeenCalledWith('w1');
      expect(screen.queryByTestId('widget-delete')).toBeNull();
    });

    test('onClose hides dialog', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('widget.buttons.delete'));
      act(() => {
        widgetDeleteProps.onClose();
      });
      expect(screen.queryByTestId('widget-delete')).toBeNull();
    });

    test('passes associated dashboards to WidgetDelete', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('widget.buttons.delete'));
      expect(widgetDeleteProps.associatedDashboards).toEqual([{ id: 'd1', name: 'Dashboard 1' }]);
    });
  });

  describe('no edit rights', () => {
    test('hides edit and delete buttons', () => {
      authStoreMock.hasRights.mockReturnValue(false);
      renderPage();
      expect(screen.queryByLabelText('widget.buttons.edit')).toBeNull();
      expect(screen.queryByLabelText('widget.buttons.delete')).toBeNull();
    });
  });
});
