// @vitest-environment happy-dom
import { authStoreMock } from '@/test/mocks/auth-store';
import { makeDashboard } from '@/test/mocks/dashboard';
import { dashboardsStoreMock } from '@/test/mocks/dashboards-store';
import { render, screen, fireEvent, within, act } from '@/test/render';
import DashboardList from './dashboard-list';

const navigateMock = vi.fn();

const { resizeWidth } = vi.hoisted(() => ({
  resizeWidth: { value: 800 },
}));

let editProps: Record<string, any> = {};

vi.mock('@/components/tooltip', () => import('@/test/mocks/tooltip'));
vi.mock('@/layouts/page', () => import('@/test/mocks/page-layout'));
vi.mock('@/components/dropdown', () => import('@/test/mocks/dropdown'));
vi.mock('@/stores/dashboards', () => import('@/test/mocks/dashboards-store'));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('use-resize-observer', () => ({ default: () => ({ ref: vi.fn(), width: resizeWidth.value }) }));
vi.mock('react-sortablejs', () => ({
  ReactSortable: ({ children, setList, list }: any) => (
    <tbody data-testid="sortable" onClick={() => setList([...list].reverse(), true)}>
      {children}
    </tbody>
  ),
}));
vi.mock('./components/dashboard-edit', () => ({
  DashboardEdit: (props: any) => {
    editProps = props;
    return props.isOpened
      ? <div data-testid="dashboard-edit">{props.dashboard ? 'edit' : 'create'}</div>
      : null;
  },
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...(actual as any), useNavigate: () => navigateMock };
});

const store = dashboardsStoreMock;

function renderList() {
  editProps = {};
  return render(<DashboardList />);
}

function resetDashboards() {
  store.dashboards.clear();
  store.dashboards.set('d1', makeDashboard({ id: 'd1', name: 'Main' }) as any);
  store.dashboards.set('d2', makeDashboard({ id: 'd2', name: 'SVG Board', isSvg: true }) as any);
  store.dashboards.set(
    'd3', makeDashboard({ id: 'd3', name: 'Hidden', options: { isHidden: true } }) as any,
  );
}

function getRow(name: string) {
  return screen.getByText(name).closest('tr')!;
}

function getEditButton(name: string) {
  return within(getRow(name)).getAllByRole('button')[0];
}

function getDeleteButton(name: string) {
  return within(getRow(name)).getAllByRole('button')[1];
}

function getVisibilityCheckbox(name: string) {
  return within(getRow(name)).getByRole('checkbox');
}

beforeEach(() => {
  vi.clearAllMocks();
  authStoreMock.hasRights.mockReturnValue(true);
  resizeWidth.value = 800;
  resetDashboards();
});

describe('DashboardList', () => {
  describe('rendering', () => {
    test('renders page title', () => {
      renderList();
      expect(screen.getByText('dashboards.title')).toBeDefined();
    });

    test('renders all dashboard names', () => {
      renderList();
      expect(screen.getByText('Main')).toBeDefined();
      expect(screen.getByText('SVG Board')).toBeDefined();
      expect(screen.getByText('Hidden')).toBeDefined();
    });

    test('shows empty message when no dashboards', () => {
      store.dashboards.clear();
      renderList();
      expect(screen.getByText('dashboards.labels.empty-list')).toBeDefined();
    });

    test('shows type column when svg dashboards exist', () => {
      renderList();
      expect(screen.getByText('dashboards.labels.type')).toBeDefined();
    });

    test('hides type column when no svg dashboards', () => {
      store.dashboards.clear();
      store.dashboards.set('d1', makeDashboard({ id: 'd1', name: 'Main' }) as any);
      renderList();
      expect(screen.queryByText('dashboards.labels.type')).toBeNull();
    });

    test('shows sort handles when multiple dashboards', () => {
      renderList();
      expect(document.querySelectorAll('.dashboardList-sortHandle').length).toBe(3);
    });

    test('hides sort handles for single dashboard', () => {
      store.dashboards.clear();
      store.dashboards.set('d1', makeDashboard({ id: 'd1', name: 'Only' }) as any);
      renderList();
      expect(document.querySelector('.dashboardList-sortHandle')).toBeNull();
    });

    test('hides sort handles when width < 480', () => {
      resizeWidth.value = 400;
      renderList();
      expect(document.querySelector('.dashboardList-sortHandle')).toBeNull();
    });
  });

  describe('type icons', () => {
    test('shows svg icon for svg dashboard', () => {
      renderList();
      expect(within(getRow('SVG Board')).getByLabelText('dashboards.labels.svg-flag')).toBeDefined();
    });

    test('shows text icon for text dashboard', () => {
      renderList();
      expect(within(getRow('Main')).getByLabelText('dashboards.labels.text-flag')).toBeDefined();
    });

    test('hides type icons when no svg dashboards exist', () => {
      store.dashboards.clear();
      store.dashboards.set('d1', makeDashboard({ id: 'd1', name: 'Only' }) as any);
      renderList();
      expect(screen.queryByLabelText('dashboards.labels.text-flag')).toBeNull();
      expect(screen.queryByLabelText('dashboards.labels.svg-flag')).toBeNull();
    });
  });

  describe('row links', () => {
    test('text dashboard row links to dashboard page', () => {
      renderList();
      expect(within(getRow('Main')).getByRole('link').getAttribute('href')).toBe('/dashboards/d1');
    });

    test('svg dashboard row links to svg view page', () => {
      renderList();
      const href = within(getRow('SVG Board')).getByRole('link').getAttribute('href');
      expect(href).toBe('/dashboards/svg/view/d2');
    });
  });

  describe('add dashboard', () => {
    test('clicking text option opens DashboardEdit in create mode', () => {
      renderList();
      fireEvent.click(screen.getByText('dashboards.labels.text-dashboard'));
      expect(screen.getByTestId('dashboard-edit')).toBeDefined();
      expect(screen.getByText('create')).toBeDefined();
      expect(editProps.dashboard).toBeUndefined();
    });

    test('clicking svg option navigates to svg add page', () => {
      renderList();
      fireEvent.click(screen.getByText('Svg'));
      expect(navigateMock).toHaveBeenCalledWith('/dashboards/svg/add');
    });
  });

  describe('edit dashboard', () => {
    test('clicking edit on text dashboard opens DashboardEdit', () => {
      renderList();
      fireEvent.click(getEditButton('Main'));
      expect(screen.getByTestId('dashboard-edit')).toBeDefined();
      expect(screen.getByText('edit')).toBeDefined();
      expect(editProps.dashboard).toBe(store.dashboards.get('d1'));
    });

    test('clicking edit on svg dashboard navigates to edit page', () => {
      renderList();
      fireEvent.click(getEditButton('SVG Board'));
      expect(navigateMock).toHaveBeenCalledWith('/dashboards/svg/edit/d2');
    });

    test('text edit button has aria-haspopup dialog', () => {
      renderList();
      expect(getEditButton('Main').getAttribute('aria-haspopup')).toBe('dialog');
    });

    test('svg edit button has no aria-haspopup', () => {
      renderList();
      expect(getEditButton('SVG Board').getAttribute('aria-haspopup')).toBeNull();
    });

    test('onSave calls addDashboard for new dashboard', async () => {
      renderList();
      fireEvent.click(screen.getByText('dashboards.labels.text-dashboard'));
      await act(async () => {
        await editProps.onSave({ id: 'new1', name: 'New' }, true);
      });
      expect(store.addDashboard).toHaveBeenCalledWith({ id: 'new1', name: 'New' });
    });

    test('onSave calls updateDashboard for existing', async () => {
      renderList();
      fireEvent.click(getEditButton('Main'));
      await act(async () => {
        await editProps.onSave({ id: 'd1', name: 'Renamed' }, false);
      });
      expect(store.updateDashboard).toHaveBeenCalledWith(
        'd1', expect.objectContaining({ id: 'd1', name: 'Renamed' }),
      );
    });

    test('onClose clears edit state', () => {
      renderList();
      fireEvent.click(getEditButton('Main'));
      expect(screen.getByTestId('dashboard-edit')).toBeDefined();
      act(() => {
        editProps.onClose();
      });
      expect(screen.queryByTestId('dashboard-edit')).toBeNull();
    });
  });

  describe('delete dashboard', () => {
    test('clicking delete shows confirmation dialog', () => {
      renderList();
      fireEvent.click(getDeleteButton('Main'));
      expect(screen.getByText('dashboards.prompt.delete-title')).toBeDefined();
    });

    test('confirming deletion calls dashboard.delete()', () => {
      renderList();
      const d1 = store.dashboards.get('d1')! as any;
      fireEvent.click(getDeleteButton('Main'));
      fireEvent.click(screen.getByText('dashboards.buttons.delete'));
      expect(d1.delete).toHaveBeenCalledOnce();
    });

    test('cancelling deletion does not call delete', () => {
      renderList();
      const d1 = store.dashboards.get('d1')! as any;
      fireEvent.click(getDeleteButton('Main'));
      fireEvent.click(screen.getByText('modal.labels.cancel'));
      expect(d1.delete).not.toHaveBeenCalled();
    });
  });

  describe('visibility toggle', () => {
    test('visible dashboard has checked switch', () => {
      renderList();
      expect((getVisibilityCheckbox('Main') as HTMLInputElement).checked).toBe(true);
    });

    test('hidden dashboard has unchecked switch', () => {
      renderList();
      expect((getVisibilityCheckbox('Hidden') as HTMLInputElement).checked).toBe(false);
    });

    test('toggling switch calls toggleVisibility', () => {
      renderList();
      fireEvent.click(getVisibilityCheckbox('Main'));
      expect((store.dashboards.get('d1') as any).toggleVisibility).toHaveBeenCalledOnce();
    });
  });

  describe('sorting', () => {
    test('reorder calls updateDashboards', () => {
      renderList();
      fireEvent.click(screen.getByTestId('sortable'));
      expect(store.updateDashboards).toHaveBeenCalledOnce();
    });
  });

  describe('no edit rights', () => {
    test('hides controls when user has no rights', () => {
      authStoreMock.hasRights.mockReturnValue(false);
      renderList();
      expect(screen.queryByTestId('add-dropdown')).toBeNull();
      const row = getRow('Main');
      expect(within(row).queryAllByRole('button')).toHaveLength(0);
      expect(within(row).queryByRole('checkbox')).toBeNull();
    });
  });
});
