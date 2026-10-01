// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@/test/render';
import NetworkConnectionsPage from './network-connections';

const { storeMock, setIsDirtyMock } = vi.hoisted(() => ({
  storeMock: {
    loading: false,
    error: '',
    isDirty: false,
    connections: {
      connections: [],
      deprecatedConnections: [],
    },
    switcher: {},
    saveAll: vi.fn(),
    deleteConnection: vi.fn(),
    selectConnection: vi.fn(),
    createConnection: vi.fn(),
    toggleConnectionState: vi.fn(),
    onSelect: vi.fn().mockResolvedValue(true),
  },
  setIsDirtyMock: vi.fn(),
  confirmChangesMock: vi.fn(),
  confirmErrorsMock: vi.fn(),
}));

vi.mock('@/utils/use-store', () => ({ useStore: () => storeMock }));
vi.mock('@/utils/prevent-page-leave', () => ({
  usePreventLeavePage: () => ({ setIsDirty: setIsDirtyMock }),
}));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ children, title, isLoading, errors }: any) => (
    <div data-testid="page-layout">
      <h1>{title}</h1>
      {isLoading && <div data-testid="loading" />}
      {errors?.map((e: any, i: number) => (
        <div key={i} data-testid="page-error">{e.text}</div>
      ))}
      {children}
    </div>
  ),
}));
vi.mock('@/components/tabs', () => ({
  Tabs: ({ items, onTabChange }: any) => (
    <div data-testid="page-tabs">
      {items?.map((i: any) => (
        <button key={i.id} data-testid={`page-tab-${i.id}`} onClick={() => onTabChange(i.id)}>
          {i.label}
        </button>
      ))}
    </div>
  ),
  TabContent: ({ children, activeTab, tabId }: any) =>
    activeTab === tabId ? <div data-testid={`page-tab-content-${tabId}`}>{children}</div> : null,
  useTabs: ({ defaultTab, onBeforeTabChange }: any) => ({
    activeTab: defaultTab,
    onTabChange: (id: number) => onBeforeTabChange?.(id, defaultTab),
  }),
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, onClick }: any) => (
    <button onClick={onClick}>{label}</button>
  ),
}));
vi.mock('@/components/alert', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
}));
vi.mock('@/components/confirm', () => ({
  Confirm: ({ isOpened, heading, children }: any) =>
    isOpened ? <div data-testid="confirm">{heading}{children}</div> : null,
  useConfirm: () => [vi.fn(), false, vi.fn(), vi.fn()],
}));
vi.mock('@/common/links', () => ({
  documentation: { en: { networks: '#networks' } },
}));
vi.mock('./components/connections-editor/connections-editor', () => ({
  ConnectionsEditor: () => <div data-testid="connections-editor" />,
}));
vi.mock('./components/switcher', () => ({
  SwitcherEditor: () => <div data-testid="switcher-editor" />,
}));

describe('NetworkConnectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMock.loading = false;
    storeMock.error = '';
    storeMock.isDirty = false;
    storeMock.connections.deprecatedConnections = [];
  });

  test('renders page title', () => {
    render(<NetworkConnectionsPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('network-connections.labels.connections');
  });

  test('renders two tabs', () => {
    render(<NetworkConnectionsPage />);
    expect(screen.getByTestId('page-tab-0')).toBeInTheDocument();
    expect(screen.getByTestId('page-tab-1')).toBeInTheDocument();
  });

  test('renders connections editor on first tab', () => {
    render(<NetworkConnectionsPage />);
    expect(screen.getByTestId('connections-editor')).toBeInTheDocument();
  });

  test('shows loading indicator when loading', () => {
    storeMock.loading = true;
    render(<NetworkConnectionsPage />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  test('shows error when present', () => {
    storeMock.error = 'Something went wrong';
    render(<NetworkConnectionsPage />);
    expect(screen.getByTestId('page-error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  test('shows deprecation alert when deprecated connections exist', () => {
    storeMock.connections.deprecatedConnections = ['eth0', 'ppp0'];
    render(<NetworkConnectionsPage />);
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });

  test('does not show deprecation alert when no deprecated connections', () => {
    storeMock.connections.deprecatedConnections = [];
    render(<NetworkConnectionsPage />);
    expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
  });

  test('calls onSelect when switching tabs', () => {
    render(<NetworkConnectionsPage />);
    fireEvent.click(screen.getByTestId('page-tab-1'));
    expect(storeMock.onSelect).toHaveBeenCalled();
  });
});
