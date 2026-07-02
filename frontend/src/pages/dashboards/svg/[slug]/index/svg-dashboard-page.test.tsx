// @vitest-environment happy-dom
import { Route, Routes } from 'react-router-dom';
import { authStoreMock } from '@/test/mocks/auth-store';
import { render, screen, fireEvent } from '@/test/render';
import { SvgDashboardPage } from './svg-dashboard-page';

const navigateMock = vi.fn();

const { storeMock, fullscreen, confirmState } = vi.hoisted(() => {
  const store = {
    loading: false,
    dashboards: [] as any[],
    dashboardIndex: 0,
    dashboardId: 'svg1',
    channelValues: new Map(),
    svgMarkup: new Map<string, string>(),
    svgErrors: new Map<string, boolean>(),
    dashboardConfigs: [] as any[],
    getDashboard: vi.fn(),
    getSvg: vi.fn(),
    isSvgLoading: vi.fn(),
    setDashboard: vi.fn(),
    setMoveToDashboardFn: vi.fn(),
    switchValue: vi.fn(),
    moveToDashboard: vi.fn(),
    reloadSvg: vi.fn(),
    unsubscribeAll: vi.fn(),
  };
  return {
    storeMock: store,
    fullscreen: { value: false, toggle: vi.fn() },
    confirmState: { isOpened: false },
  };
});

vi.mock('@/components/tooltip', () => import('@/test/mocks/tooltip'));
vi.mock('@/components/confirm', () => ({
  Confirm: ({ isOpened, heading, children }: any) =>
    isOpened ? <div data-testid="confirm-dialog"><h3>{heading}</h3>{children}</div> : null,
  useConfirm: () => [vi.fn(), confirmState.isOpened, vi.fn(), vi.fn()],
}));
vi.mock('use-resize-observer', () => ({ default: () => ({ ref: vi.fn(), width: 800 }) }));
vi.mock('@/layouts/page', () => import('@/test/mocks/page-layout'));
vi.mock('./components/dashboard-carousel', () => ({
  DashboardCarousel: ({ children }: any) => <div data-testid="carousel">{children}</div>,
}));
vi.mock('./components/svg-view', () => ({
  SvgView: ({ id, className }: any) => <div data-testid={`svg-${id}`} className={className} />,
}));
vi.mock('@/components/loader', () => ({ Loader: () => <div data-testid="loader" /> }));
vi.mock('@/utils/full-screen', () => ({
  useToggleFullscreen: () => [fullscreen.value, fullscreen.toggle],
}));
vi.mock('@/utils/use-store', () => ({ useStore: (fn: any) => fn() }));
vi.mock('./store', () => ({
  SvgDashboardPageStore: function SvgDashboardPageStore() {
    return storeMock;
  },
}));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...(actual as any), useNavigate: () => navigateMock };
});

function renderPage(path = '/dashboards/svg/view/svg1') {
  return render(
    <Routes><Route path="/dashboards/svg/view/:id" element={<SvgDashboardPage />} /></Routes>,
    { initialEntries: [path] },
  );
}

function resetStore() {
  storeMock.loading = false;
  storeMock.dashboardId = 'svg1';
  storeMock.dashboardIndex = 0;
  storeMock.dashboardConfigs = [{ id: 'svg1', isSvg: true, name: 'SVG Dash' }];
  storeMock.dashboards = [
    { id: 'svg1', name: 'SVG Dash', svg: { params: [] }, svg_fullwidth: false },
  ];
  storeMock.svgMarkup = new Map<string, string>([['svg1', '<svg/>']]);
  storeMock.svgErrors = new Map<string, boolean>();
  storeMock.getDashboard.mockImplementation(
    (id: string) => storeMock.dashboardConfigs.find((d: any) => d.id === id) || null,
  );
  storeMock.getSvg.mockImplementation((id: string) => storeMock.svgMarkup.get(id) ?? null);
}

beforeEach(() => {
  vi.clearAllMocks();
  authStoreMock.hasRights.mockReturnValue(true);
  fullscreen.value = false;
  confirmState.isOpened = false;
  resetStore();
});

describe('SvgDashboardPage', () => {
  describe('rendering', () => {
    test('renders page title', () => {
      renderPage();
      expect(screen.getByText('SVG Dash')).toBeDefined();
    });

    test('renders carousel', () => {
      renderPage();
      expect(screen.getByTestId('carousel')).toBeDefined();
    });

    test('renders svg view', () => {
      renderPage();
      expect(screen.getByTestId('svg-svg1')).toBeDefined();
    });

    test('renders multiple dashboards', () => {
      storeMock.dashboards = [
        { id: 'svg1', svg: { current: '<svg/>', params: [] }, svg_fullwidth: false },
        { id: 'svg2', svg: { current: '<svg/>', params: [] }, svg_fullwidth: false },
      ];
      renderPage();
      expect(screen.getByTestId('svg-svg1')).toBeDefined();
      expect(screen.getByTestId('svg-svg2')).toBeDefined();
    });

    test('applies fitToPage class when svg_fullwidth', () => {
      storeMock.dashboards = [
        { id: 'svg1', svg: { current: '<svg/>', params: [] }, svg_fullwidth: true },
      ];
      renderPage();
      expect(document.querySelector('.svgDashboard-fitToPage')).not.toBeNull();
    });

    test('no fitToPage class when svg_fullwidth is false', () => {
      renderPage();
      expect(document.querySelector('.svgDashboard-fitToPage')).toBeNull();
    });

    test('renders an inline error instead of the svg view when the markup failed to load', () => {
      storeMock.svgErrors = new Map<string, boolean>([['svg1', true]]);
      renderPage();
      expect(screen.queryByTestId('svg-svg1')).toBeNull();
      expect(screen.getByText('dashboards.errors.svg-load')).toBeDefined();
    });

    test('clicking the retry button in the error calls reloadSvg for that dashboard', () => {
      storeMock.svgErrors = new Map<string, boolean>([['svg1', true]]);
      renderPage();
      fireEvent.click(screen.getByText('svg-dashboard.buttons.retry'));
      expect(storeMock.reloadSvg).toHaveBeenCalledWith('svg1');
    });

    test('renders a loader instead of the svg view while the markup is still loading', () => {
      storeMock.isSvgLoading.mockReturnValue(true);
      storeMock.svgMarkup = new Map<string, string>();
      storeMock.svgErrors = new Map<string, boolean>();
      renderPage();
      expect(screen.getByTestId('loader')).toBeDefined();
      expect(screen.queryByTestId('svg-svg1')).toBeNull();
    });
  });

  describe('edit button', () => {
    test('renders edit link for operator', () => {
      renderPage();
      expect(screen.getByText('svg-dashboard.buttons.edit')).toBeDefined();
    });

    test('hides edit link without rights', () => {
      authStoreMock.hasRights.mockReturnValue(false);
      renderPage();
      expect(screen.queryByText('svg-dashboard.buttons.edit')).toBeNull();
    });

    test('hides edit link in fullscreen mode', () => {
      fullscreen.value = true;
      renderPage();
      expect(screen.queryByText('svg-dashboard.buttons.edit')).toBeNull();
    });

    test('hides edit link with fullscreen search param', () => {
      renderPage('/dashboards/svg/view/svg1?fullscreen');
      expect(screen.queryByText('svg-dashboard.buttons.edit')).toBeNull();
    });
  });

  describe('fullscreen', () => {
    test('renders fullscreen button', () => {
      renderPage();
      expect(screen.getByLabelText('svg-dashboard.buttons.fullscreen')).toBeDefined();
    });

    test('clicking toggle calls toggleFullscreen', () => {
      renderPage();
      fireEvent.click(screen.getByLabelText('svg-dashboard.buttons.fullscreen'));
      expect(fullscreen.toggle).toHaveBeenCalledOnce();
    });

    test('shows exit-fullscreen label when active', () => {
      fullscreen.value = true;
      renderPage();
      expect(screen.getByLabelText('svg-dashboard.buttons.exit-fullscreen')).toBeDefined();
    });

    test('hides toggle with fullscreen search param', () => {
      renderPage('/dashboards/svg/view/svg1?fullscreen');
      expect(screen.queryByLabelText('svg-dashboard.buttons.fullscreen')).toBeNull();
    });
  });

  describe('store lifecycle', () => {
    test('calls setDashboard on mount', () => {
      renderPage();
      expect(storeMock.setDashboard).toHaveBeenCalledWith('svg1');
    });

    test('calls setMoveToDashboardFn on mount', () => {
      renderPage();
      expect(storeMock.setMoveToDashboardFn).toHaveBeenCalledOnce();
    });

    test('calls unsubscribeAll on unmount', () => {
      const { unmount } = renderPage();
      unmount();
      expect(storeMock.unsubscribeAll).toHaveBeenCalled();
    });

    test('does not call setDashboard when configs empty', () => {
      storeMock.dashboardConfigs = [];
      renderPage();
      expect(storeMock.setDashboard).not.toHaveBeenCalled();
    });
  });

  describe('moveToDashboardFn', () => {
    function getMoveFn(path?: string) {
      renderPage(path);
      return storeMock.setMoveToDashboardFn.mock.calls[0][0];
    }

    test('navigates to svg dashboard', () => {
      const moveFn = getMoveFn();
      moveFn('svg1', 'source1');
      expect(navigateMock).toHaveBeenCalledWith('/dashboards/svg/view/svg1');
    });

    test('navigates to non-svg dashboard with sourceDashboardId', () => {
      storeMock.dashboardConfigs.push({ id: 'text1', isSvg: false, name: 'Text' });
      const moveFn = getMoveFn();
      moveFn('text1', 'svg1');
      expect(navigateMock).toHaveBeenCalledWith(
        '/dashboards/text1?sourceDashboardId=svg1',
      );
    });

    test('preserves fullscreen param', () => {
      const moveFn = getMoveFn('/dashboards/svg/view/svg1?fullscreen=true');
      moveFn('svg1', 'source1');
      expect(navigateMock).toHaveBeenCalledWith(
        '/dashboards/svg/view/svg1?fullscreen=true',
      );
    });

    test('preserves hmi and hmicolor params', () => {
      const moveFn = getMoveFn('/dashboards/svg/view/svg1?hmi&hmicolor=dark');
      moveFn('svg1', 'source1');
      expect(navigateMock).toHaveBeenCalledWith(
        '/dashboards/svg/view/svg1?hmi=true&hmicolor=dark',
      );
    });

    test('does not navigate for unknown dashboard', () => {
      const moveFn = getMoveFn();
      moveFn('nonexistent', 'source1');
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  describe('confirm dialog', () => {
    test('renders confirm dialog when opened', () => {
      confirmState.isOpened = true;
      renderPage();
      expect(screen.getByTestId('confirm-dialog')).toBeDefined();
      expect(screen.getByText('svg-dashboard.prompt.confirm-heading')).toBeDefined();
      expect(screen.getByText('svg-dashboard.prompt.confirm-question')).toBeDefined();
    });

    test('hides confirm dialog when closed', () => {
      confirmState.isOpened = false;
      renderPage();
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    });
  });
});
