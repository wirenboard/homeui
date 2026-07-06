// @vitest-environment happy-dom
import { Route, Routes } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@/test/render';
import EditSvgDashboardPage from './edit-svg-dashboard-page';

const navigateMock = vi.fn();

vi.mock('@/components/tooltip', () => ({ Tooltip: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ children, title, actions, errors }: any) => (
    <div>
      <h1>{title}</h1>
      <div data-testid="actions">{actions}</div>
      {errors?.map((e: any, i: number) => <div key={i} data-testid="page-error">{e.text}</div>)}
      {children}
    </div>
  ),
}));
vi.mock('./components/visual-edit-view', () => ({
  VisualEditView: () => <div data-testid="visual-edit" />,
}));
vi.mock('./components/json-bindings-editor', () => ({
  default: () => <div data-testid="json-editor" />,
}));
vi.mock('@/utils/use-store', () => ({ useStore: (fn: any) => fn() }));
vi.mock('@/utils/async-action', () => ({
  useAsyncAction: (fn: any) => [fn, false],
}));
vi.mock('@/components/confirm', () => ({
  Confirm: ({ isOpened, heading, children, confirmCallback, closeCallback }: any) =>
    isOpened ? (
      <div data-testid="confirm-dialog">
        <h3>{heading}</h3>{children}
        <button data-testid="confirm-yes" onClick={confirmCallback}>yes</button>
        <button data-testid="confirm-close" onClick={closeCallback}>close</button>
      </div>
    ) : null,
}));

const { mockStore, dashMock } = vi.hoisted(() => ({
  mockStore: {
    isNew: true,
    isLoading: false,
    isValid: true,
    commonParameters: { id: '', name: 'Test SVG', svg_fullwidth: false },
    swipeParameters: { enable: false, left: null, right: null },
    bindingsStore: { jsonEditMode: false },
    svgStore: { svg: null, hasSvg: false },
    svgLoadError: false,
    idConflictError: false,
    setDashboard: vi.fn(),
    onSaveDashboard: vi.fn(async () => 'new-id'),
    removeDashboard: vi.fn(),
  },
  dashMock: { isLoading: false, saveError: null as string | null, dashboardsList: [] },
}));

vi.mock('./stores/store', () => ({
  EditSvgDashboardPageStore: class {
    constructor() {
      Object.assign(this, mockStore);
    }
  },
}));
vi.mock('@/stores/dashboards', () => ({ dashboardsStore: dashMock }));
vi.mock('@/stores/devices', () => ({ devicesStore: { topics: [] } }));
vi.mock('@/stores/auth', () => ({
  authStore: { hasRights: vi.fn(() => true) },
  UserRole: { Operator: 'operator' },
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...(actual as any), useNavigate: () => navigateMock };
});

describe('EditSvgDashboardPage', () => {
  function renderPage(path = '/dashboards/svg/add') {
    return render(
      <Routes>
        <Route path="/dashboards/svg/add" element={<EditSvgDashboardPage />} />
        <Route path="/dashboards/svg/edit/:id" element={<EditSvgDashboardPage />} />
      </Routes>,
      { initialEntries: [path] },
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.isNew = true;
    mockStore.isValid = true;
    mockStore.svgLoadError = false;
    mockStore.idConflictError = false;
    mockStore.bindingsStore.jsonEditMode = false;
    dashMock.saveError = null;
  });

  test('renders create title for new dashboard', () => {
    renderPage();
    expect(screen.getByText('edit-svg-dashboard.labels.create')).toBeDefined();
  });

  test('renders visual edit view by default', () => {
    renderPage();
    expect(screen.getByTestId('visual-edit')).toBeDefined();
  });

  test('renders save button', () => {
    renderPage();
    expect(screen.getByText('edit-svg-dashboard.buttons.save')).toBeDefined();
  });

  test('renders cancel button for new dashboard', () => {
    renderPage();
    expect(screen.getByText('edit-svg-dashboard.buttons.cancel')).toBeDefined();
  });

  test('renders edit title for existing dashboard', () => {
    mockStore.isNew = false;
    renderPage('/dashboards/svg/edit/dash1');
    expect(screen.getByText('edit-svg-dashboard.labels.edit')).toBeDefined();
  });

  test('renders remove and preview buttons for existing dashboard', () => {
    mockStore.isNew = false;
    renderPage('/dashboards/svg/edit/dash1');
    expect(screen.getByText('edit-svg-dashboard.buttons.remove')).toBeDefined();
    expect(screen.getByText('edit-svg-dashboard.buttons.preview')).toBeDefined();
  });

  test('preview button links to view page', () => {
    mockStore.isNew = false;
    renderPage('/dashboards/svg/edit/dash1');
    const link = screen.getByText('edit-svg-dashboard.buttons.preview').closest('a');
    expect(link?.getAttribute('href')).toBe('/dashboards/svg/view/dash1');
  });

  test('json edit mode shows json editor', async () => {
    mockStore.bindingsStore.jsonEditMode = true;
    renderPage();
    expect(await screen.findByTestId('json-editor')).toBeDefined();
    expect(screen.queryByTestId('visual-edit')).toBeNull();
  });

  test('shows save error from dashboards store', () => {
    dashMock.saveError = 'Failed to save';
    renderPage();
    expect(screen.getByText('Failed to save')).toBeDefined();
  });

  test('shows the svg load error when the markup failed to load', () => {
    mockStore.svgLoadError = true;
    renderPage();
    expect(screen.getByText('dashboards.errors.svg-load')).toBeDefined();
  });

  test('shows the id-taken error when a save hit a 409 conflict', () => {
    mockStore.idConflictError = true;
    renderPage();
    expect(screen.getByText('dashboards.errors.duplicate')).toBeDefined();
  });

  test('save button disabled when form is invalid', () => {
    mockStore.isValid = false;
    renderPage();
    const btn = screen.getByText('edit-svg-dashboard.buttons.save').closest('button');
    expect(btn?.disabled).toBe(true);
  });

  test('save calls onSaveDashboard and navigates to edit', async () => {
    renderPage();
    fireEvent.click(screen.getByText('edit-svg-dashboard.buttons.save'));
    await waitFor(() => {
      expect(mockStore.onSaveDashboard).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/dashboards/svg/edit/new-id');
    });
  });

  test('does not navigate when the save fails (onSaveDashboard returns null)', async () => {
    mockStore.onSaveDashboard.mockResolvedValueOnce(null);
    renderPage();
    fireEvent.click(screen.getByText('edit-svg-dashboard.buttons.save'));
    await waitFor(() => expect(mockStore.onSaveDashboard).toHaveBeenCalled());
    expect(navigateMock).not.toHaveBeenCalled();
  });

  test('cancel navigates to the list without deleting (a new dashboard is not yet persisted)', async () => {
    renderPage();
    fireEvent.click(screen.getByText('edit-svg-dashboard.buttons.cancel'));
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboards');
    });
    expect(mockStore.removeDashboard).not.toHaveBeenCalled();
  });

  test('remove button opens confirm dialog', () => {
    mockStore.isNew = false;
    renderPage('/dashboards/svg/edit/dash1');
    fireEvent.click(screen.getByText('edit-svg-dashboard.buttons.remove'));
    expect(screen.getByTestId('confirm-dialog')).toBeDefined();
    expect(screen.getByText('edit-svg-dashboard.prompt.confirm-remove')).toBeDefined();
  });

  test('confirming delete removes dashboard and navigates', async () => {
    mockStore.isNew = false;
    renderPage('/dashboards/svg/edit/dash1');
    fireEvent.click(screen.getByText('edit-svg-dashboard.buttons.remove'));
    fireEvent.click(screen.getByTestId('confirm-yes'));
    await waitFor(() => {
      expect(mockStore.removeDashboard).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith('/dashboards');
    });
  });

  test('calls setDashboard with null on add path', () => {
    renderPage('/dashboards/svg/add');
    expect(mockStore.setDashboard).toHaveBeenCalledWith(null);
  });

  test('calls setDashboard with id on edit path', () => {
    mockStore.isNew = false;
    renderPage('/dashboards/svg/edit/dash1');
    expect(mockStore.setDashboard).toHaveBeenCalledWith('dash1');
  });

  test('closing delete dialog hides it', () => {
    mockStore.isNew = false;
    renderPage('/dashboards/svg/edit/dash1');
    fireEvent.click(screen.getByText('edit-svg-dashboard.buttons.remove'));
    expect(screen.getByTestId('confirm-dialog')).toBeDefined();
    fireEvent.click(screen.getByTestId('confirm-close'));
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });
});
