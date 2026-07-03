// @vitest-environment happy-dom
import { Route, Routes } from 'react-router-dom';
import { authStoreMock } from '@/test/mocks/auth-store';
import { render, screen, fireEvent, within, act } from '@/test/render';
import DashboardPage from './dashboard';

const navigateMock = vi.fn();

const { dashStore, deviceStore, fullscreen } = vi.hoisted(() => ({
  fullscreen: { value: false, toggle: vi.fn() },
  dashStore: {
    widgets: new Map<string, any>([
      ['w1', {
        id: 'w1', name: 'Widget 1', compact: false, save: vi.fn(),
        cells: [
          { id: 'dev/ctrl', name: 'Ctrl' },
          { id: 'missing-cell', name: 'Gone' },
          { id: 'sep', name: 'Section', type: 'separator' },
          { id: 'sep2', name: '', type: 'separator' },
        ],
      }],
    ]),
    dashboards: new Map<string, any>([
      ['test-dash', { id: 'test-dash', name: 'Test Dashboard', widgets: ['w1'] }],
    ]),
    isLoading: false,
    removeWidgetFromDashboard: vi.fn(),
  },
  deviceStore: {
    cells: new Map<string, any>([
      ['dev/ctrl', { id: 'dev/ctrl', name: 'Ctrl', value: '42' }],
    ]),
    topicsWithoutSystem: [],
  },
}));

let widgetAddProps: any = null;
let widgetEditProps: any = null;

vi.mock('@/components/tooltip', () => import('@/test/mocks/tooltip'));
vi.mock('@/layouts/page', () => import('@/test/mocks/page-layout'));
vi.mock('@/components/columns-wrapper', () => ({
  ColumnsWrapper: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/card', () => ({
  Card: ({ children, heading, actions, id }: any) => (
    <div data-testid={`card-${id}`}>
      <h3>{heading}</h3>
      {actions?.map((a: any) => (
        <button key={a.title} onClick={() => a.action(id)}>{a.title}</button>
      ))}
      {children}
    </div>
  ),
}));
vi.mock('@/components/cell', () => ({
  Cell: ({ name }: any) => <div data-testid="cell">{name}</div>,
}));
vi.mock('./components/widget-add', () => ({
  WidgetAdd: (props: any) => {
    widgetAddProps = props;
    return props.isOpened ? <div data-testid="widget-add" /> : null;
  },
}));
vi.mock('./components/widget-edit', () => ({
  WidgetEdit: (props: any) => {
    widgetEditProps = props;
    return props.isOpened ? <div data-testid="widget-edit" /> : null;
  },
}));
vi.mock('@/utils/full-screen', () => ({
  useToggleFullscreen: () => [fullscreen.value, fullscreen.toggle],
}));
vi.mock('@/stores/dashboards', () => ({ dashboardsStore: dashStore }));
vi.mock('@/stores/devices', () => ({ devicesStore: deviceStore }));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...(actual as any), useNavigate: () => navigateMock };
});

function renderPage(path = '/dashboards/test-dash') {
  widgetAddProps = null;
  widgetEditProps = null;
  return render(
    <Routes><Route path="/dashboards/:id" element={<DashboardPage />} /></Routes>,
    { initialEntries: [path] },
  );
}

function resetData() {
  dashStore.widgets.get('w1')!.save.mockReset();
  dashStore.dashboards.set('test-dash', {
    id: 'test-dash', name: 'Test Dashboard', widgets: ['w1'],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authStoreMock.hasRights.mockReturnValue(true);
  fullscreen.value = false;
  resetData();
});

describe('DashboardPage', () => {
  describe('rendering', () => {
    test('renders dashboard title', () => {
      renderPage();
      expect(screen.getByText('Test Dashboard')).toBeDefined();
    });

    test('renders widget cards', () => {
      renderPage();
      expect(screen.getByText('Widget 1')).toBeDefined();
    });

    test('shows no-widgets message when empty', () => {
      dashStore.dashboards.set('test-dash', { id: 'test-dash', name: 'Empty', widgets: [] });
      renderPage();
      expect(screen.getByText('dashboard.labels.no-widgets')).toBeDefined();
    });

    test('renders cells from devices store', () => {
      renderPage();
      expect(screen.getByText('Ctrl')).toBeDefined();
    });

    test('renders separator cells', () => {
      renderPage();
      expect(screen.getByText('Section')).toBeDefined();
      expect(document.querySelector('.dashboard-separator')).not.toBeNull();
    });

    test('shows fallback for missing cells', () => {
      renderPage();
      expect(screen.getByText('Gone')).toBeDefined();
    });

    test('renders empty title for unknown dashboard', () => {
      renderPage('/dashboards/unknown-id');
      expect(screen.queryByText('Test Dashboard')).toBeNull();
      expect(screen.getByText('dashboard.labels.no-widgets')).toBeDefined();
    });

    test('separator without name renders without title', () => {
      renderPage();
      const separators = document.querySelectorAll('.dashboard-separator');
      expect(separators.length).toBe(2);
      expect(separators[0].querySelector('.dashboard-separatorTitle')).not.toBeNull();
      expect(separators[1].querySelector('.dashboard-separatorTitle')).toBeNull();
    });

    test('skips missing widgets', () => {
      dashStore.dashboards.set('test-dash', {
        id: 'test-dash', name: 'Test', widgets: ['w1', 'nonexistent'],
      });
      renderPage();
      expect(screen.getByText('Widget 1')).toBeDefined();
      expect(screen.queryByTestId('card-nonexistent')).toBeNull();
    });
  });

  describe('add widget', () => {
    test('shows add-widget button for operator', () => {
      renderPage();
      expect(screen.getByText('dashboard.buttons.add-widget')).toBeDefined();
    });

    test('clicking add-widget opens modal', () => {
      renderPage();
      fireEvent.click(screen.getByText('dashboard.buttons.add-widget'));
      expect(screen.getByTestId('widget-add')).toBeDefined();
      expect(widgetAddProps.dashboard).toBe(dashStore.dashboards.get('test-dash'));
    });

    test('hides add-widget button without edit rights', () => {
      authStoreMock.hasRights.mockReturnValue(false);
      renderPage();
      expect(screen.queryByText('dashboard.buttons.add-widget')).toBeNull();
    });

    test('hides add-widget button in fullscreen mode', () => {
      fullscreen.value = true;
      renderPage();
      expect(screen.queryByText('dashboard.buttons.add-widget')).toBeNull();
    });
  });

  describe('remove widget', () => {
    test('clicking remove action shows confirm dialog', () => {
      renderPage();
      const card = screen.getByTestId('card-w1');
      fireEvent.click(within(card).getByText('dashboard.buttons.remove-widget'));
      expect(screen.getByText('dashboard.prompt.remove-title')).toBeDefined();
    });

    test('confirming calls removeWidgetFromDashboard', () => {
      renderPage();
      fireEvent.click(
        within(screen.getByTestId('card-w1')).getByText('dashboard.buttons.remove-widget'),
      );
      fireEvent.click(screen.getByText('modal.labels.yes'));
      expect(dashStore.removeWidgetFromDashboard).toHaveBeenCalledWith('test-dash', 'w1');
    });

    test('cancelling does not remove', () => {
      renderPage();
      fireEvent.click(
        within(screen.getByTestId('card-w1')).getByText('dashboard.buttons.remove-widget'),
      );
      fireEvent.click(screen.getByText('modal.labels.cancel'));
      expect(dashStore.removeWidgetFromDashboard).not.toHaveBeenCalled();
    });
  });

  describe('edit widget', () => {
    test('clicking edit action opens WidgetEdit', () => {
      renderPage();
      fireEvent.click(
        within(screen.getByTestId('card-w1')).getByText('dashboard.buttons.edit-widget'),
      );
      expect(screen.getByTestId('widget-edit')).toBeDefined();
      expect(widgetEditProps.widget).toBe(dashStore.widgets.get('w1'));
    });

    test('onSave calls widget.save and closes editor', () => {
      renderPage();
      fireEvent.click(
        within(screen.getByTestId('card-w1')).getByText('dashboard.buttons.edit-widget'),
      );
      const saveData = { name: 'Updated' };
      act(() => {
        widgetEditProps.onSave(saveData);
      });
      expect(dashStore.widgets.get('w1')!.save).toHaveBeenCalledWith(saveData);
      expect(screen.queryByTestId('widget-edit')).toBeNull();
    });

    test('onClose hides editor', () => {
      renderPage();
      fireEvent.click(
        within(screen.getByTestId('card-w1')).getByText('dashboard.buttons.edit-widget'),
      );
      act(() => {
        widgetEditProps.onClose();
      });
      expect(screen.queryByTestId('widget-edit')).toBeNull();
    });
  });

  describe('fullscreen', () => {
    test('renders fullscreen toggle button', () => {
      renderPage();
      expect(screen.getByLabelText('dashboard.buttons.fullscreen')).toBeDefined();
    });

    test('clicking toggle calls toggleFullscreen', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('dashboard.buttons.fullscreen'));
      expect(fullscreen.toggle).toHaveBeenCalledOnce();
    });

    test('shows exit-fullscreen label when active', () => {
      fullscreen.value = true;
      renderPage();
      expect(screen.getByLabelText('dashboard.buttons.fullscreen-exit')).toBeDefined();
    });

    test('fullscreen search param hides all actions', () => {
      renderPage('/dashboards/test-dash?fullscreen');
      expect(screen.queryByText('dashboard.buttons.add-widget')).toBeNull();
      expect(screen.queryByLabelText('dashboard.buttons.fullscreen')).toBeNull();
    });
  });

  describe('back to dashboard', () => {
    test('shows back button when sourceDashboardId exists', () => {
      renderPage('/dashboards/test-dash?sourceDashboardId=svg1');
      expect(screen.getByText('dashboard.buttons.back-to-dashboard')).toBeDefined();
    });

    test('hides back button without sourceDashboardId', () => {
      renderPage();
      expect(screen.queryByText('dashboard.buttons.back-to-dashboard')).toBeNull();
    });

    test('navigates back to source svg dashboard', () => {
      renderPage('/dashboards/test-dash?sourceDashboardId=svg1');
      fireEvent.click(screen.getByText('dashboard.buttons.back-to-dashboard'));
      expect(navigateMock).toHaveBeenCalledWith('/dashboards/svg/view/svg1');
    });

    test('preserves hmi params on back navigation', () => {
      renderPage('/dashboards/test-dash?sourceDashboardId=svg1&hmi&hmicolor=dark');
      const buttons = screen.getAllByText('dashboard.buttons.back-to-dashboard');
      fireEvent.click(buttons[buttons.length - 1]);
      expect(navigateMock).toHaveBeenCalledWith('/dashboards/svg/view/svg1?hmi&hmicolor=dark');
    });
  });

  describe('HMI mode', () => {
    test('hides card actions in HMI mode', () => {
      renderPage('/dashboards/test-dash?hmi');
      const card = screen.getByTestId('card-w1');
      expect(within(card).queryByText('dashboard.buttons.remove-widget')).toBeNull();
      expect(within(card).queryByText('dashboard.buttons.edit-widget')).toBeNull();
    });

    test('adds fullscreen CSS class in HMI mode', () => {
      renderPage('/dashboards/test-dash?hmi');
      expect(document.querySelector('.dashboard-fullScreen')).not.toBeNull();
    });
  });

  describe('no edit rights', () => {
    test('hides card actions when no rights', () => {
      authStoreMock.hasRights.mockReturnValue(false);
      renderPage();
      const card = screen.getByTestId('card-w1');
      expect(within(card).queryByText('dashboard.buttons.remove-widget')).toBeNull();
    });
  });
});
