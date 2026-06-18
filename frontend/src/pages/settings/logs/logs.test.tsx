// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@/test/render';
import LogsPage from './logs';

const { storeMock, downloadFileMock } = vi.hoisted(() => ({
  storeMock: {
    logs: [] as any[],
    services: [] as string[],
    boots: [] as any[],
    isLoading: false,
    loadServicesAndBoots: vi.fn().mockResolvedValue(undefined),
    loadLogs: vi.fn().mockResolvedValue(true),
    clearLogs: vi.fn(),
  },
  downloadFileMock: vi.fn(),
}));

vi.mock('@/utils/use-store', () => ({ useStore: () => storeMock }));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/stores/logs', () => ({
  LogLevel: {
    Emergency: 0, Alert: 1, Critical: 2, Error: 3,
    Warning: 4, Notice: 5, Info: 6, Debug: 7,
  },
  LogsStore: vi.fn(),
}));
vi.mock('@/utils/download', () => ({ downloadFile: downloadFileMock }));
vi.mock('@/common/links', () => ({ documentation: { en: { logs: '#logs' } } }));
vi.mock('@/common/constants', () => ({
  RpcErrorCode: { Parse: -32700, Server: -32000, Timeout: -32600 },
}));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ children, title, errors, actions }: any) => (
    <div data-testid="page-layout">
      <h1>{title}</h1>
      {errors?.map((e: any, i: number) => (
        <div key={i} data-testid="page-error">{e.text}</div>
      ))}
      <div data-testid="actions">{actions}</div>
      {children}
    </div>
  ),
}));
vi.mock('@/components/button', () => ({
  Button: ({ onClick, disabled, icon }: any) => (
    <button data-testid="download-btn" disabled={disabled} onClick={onClick}>
      {icon}
    </button>
  ),
}));
vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
}));
vi.mock('react-infinite-scroll-component', () => ({
  default: ({ children, endMessage, hasMore }: any) => (
    <div data-testid="infinite-scroll">{children}{!hasMore && endMessage}</div>
  ),
}));
vi.mock('./componentns/filters', () => ({
  LogsFilters: () => <div data-testid="logs-filters" />,
}));
vi.mock('@/assets/icons/download.svg', () => ({
  default: () => <span data-testid="download-icon" />,
}));

describe('LogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMock.logs = [];
    storeMock.isLoading = false;
    storeMock.loadServicesAndBoots.mockResolvedValue(undefined);
    storeMock.loadLogs.mockResolvedValue(true);
  });

  test('renders page title', () => {
    render(<LogsPage />);
    expect(screen.getByRole('heading')).toHaveTextContent('logs.title');
  });

  test('calls loadServicesAndBoots on mount', () => {
    render(<LogsPage />);
    expect(storeMock.loadServicesAndBoots).toHaveBeenCalled();
  });

  test('calls loadLogs on mount', () => {
    render(<LogsPage />);
    expect(storeMock.loadLogs).toHaveBeenCalled();
  });

  test('disables download button when no logs', () => {
    render(<LogsPage />);
    expect(screen.getByTestId('download-btn')).toBeDisabled();
  });

  test('enables download button when logs present', () => {
    storeMock.logs = [{ time: 1700000000000, level: 6, msg: 'ok', service: 'svc' }];
    render(<LogsPage />);
    expect(screen.getByTestId('download-btn')).not.toBeDisabled();
  });

  test('renders filters when no errors', () => {
    render(<LogsPage />);
    expect(screen.getByTestId('logs-filters')).toBeInTheDocument();
  });

  test('hides filters on services error', async () => {
    storeMock.loadServicesAndBoots.mockRejectedValue(new Error('fail'));
    storeMock.loadLogs.mockReturnValue(new Promise(() => {}));
    render(<LogsPage />);
    await screen.findByTestId('page-error');
    expect(screen.queryByTestId('logs-filters')).not.toBeInTheDocument();
  });

  test('shows error on loadServicesAndBoots failure', async () => {
    storeMock.loadServicesAndBoots.mockRejectedValue(new Error('fail'));
    storeMock.loadLogs.mockReturnValue(new Promise(() => {}));
    render(<LogsPage />);
    const err = await screen.findByTestId('page-error');
    expect(err).toHaveTextContent('logs.errors.services');
  });

  test('shows error on loadLogs non-RPC failure', async () => {
    storeMock.loadLogs.mockRejectedValue({ code: -1 });
    render(<LogsPage />);
    const err = await screen.findByTestId('page-error');
    expect(err).toHaveTextContent('logs.errors.unavailable');
  });

  test('clears logs on RPC parse error', async () => {
    storeMock.loadLogs.mockRejectedValue({ code: -32700 });
    render(<LogsPage />);
    await vi.waitFor(() => expect(storeMock.clearLogs).toHaveBeenCalled());
  });

  test('clears logs on RPC server error', async () => {
    storeMock.loadLogs.mockRejectedValue({ code: -32000 });
    render(<LogsPage />);
    await vi.waitFor(() => expect(storeMock.clearLogs).toHaveBeenCalled());
  });

  test('clears logs on RPC timeout error', async () => {
    storeMock.loadLogs.mockRejectedValue({ code: -32600 });
    render(<LogsPage />);
    await vi.waitFor(() => expect(storeMock.clearLogs).toHaveBeenCalled());
  });

  test('renders log entry with message and service', () => {
    storeMock.logs = [
      { time: 1700000000000, level: 6, msg: 'Hello world', service: 'wb-rules' },
    ];
    render(<LogsPage />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('[wb-rules]')).toBeInTheDocument();
  });

  test('renders empty service column for log without service', () => {
    storeMock.logs = [
      { time: 1700000000000, level: 6, msg: 'No svc', service: '' },
    ];
    render(<LogsPage />);
    expect(screen.getByText('No svc')).toBeInTheDocument();
    expect(screen.queryByText(/\[.*\]/)).not.toBeInTheDocument();
  });

  test('applies warning class', () => {
    storeMock.logs = [
      { time: 1700000000000, level: 4, msg: 'Warn msg', service: 'svc' },
    ];
    render(<LogsPage />);
    expect(screen.getByText('Warn msg')).toHaveClass('logs-cellWarn');
  });

  test('applies error class', () => {
    storeMock.logs = [
      { time: 1700000000000, level: 3, msg: 'Err msg', service: 'svc' },
    ];
    render(<LogsPage />);
    expect(screen.getByText('Err msg')).toHaveClass('logs-cellError');
  });

  test('applies debug class', () => {
    storeMock.logs = [
      { time: 1700000000000, level: 7, msg: 'Debug msg', service: 'svc' },
    ];
    render(<LogsPage />);
    expect(screen.getByText('Debug msg')).toHaveClass('logs-cellDebug');
  });

  test('formats log date', () => {
    storeMock.logs = [
      { time: 1700000000000, level: 6, msg: 'dated', service: 'svc' },
    ];
    render(<LogsPage />);
    expect(
      screen.getByText(/\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}\.\d{3}/),
    ).toBeInTheDocument();
  });

  test('shows no-logs message when empty and no more', async () => {
    storeMock.loadLogs.mockResolvedValue(false);
    render(<LogsPage />);
    expect(
      await screen.findByText('logs.labels.no-logs-with-filter'),
    ).toBeInTheDocument();
  });

  test('calls downloadFile on download click', () => {
    storeMock.logs = [
      { time: 1700000000000, level: 6, msg: 'Log line', service: 'wb-rules' },
    ];
    render(<LogsPage />);
    fireEvent.click(screen.getByTestId('download-btn'));
    expect(downloadFileMock).toHaveBeenCalled();
    expect(downloadFileMock.mock.calls[0][0]).toMatch(/\.log$/);
  });

  test('renders multiple log entries', () => {
    storeMock.logs = [
      { time: 1700000000000, level: 6, msg: 'First', service: 'a' },
      { time: 1700000001000, level: 4, msg: 'Second', service: 'b' },
      { time: 1700000002000, level: 3, msg: 'Third', service: 'c' },
    ];
    render(<LogsPage />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });
});
