// @vitest-environment happy-dom
import { authStoreMock } from '@/test/mocks/auth-store';
import { render, screen, fireEvent } from '@/test/render';
import ConfigsPage from './configs';

const { configsStoreMock, copyMock } = vi.hoisted(() => ({
  configsStoreMock: {
    configs: [] as any[],
    getList: vi.fn(),
  },
  copyMock: vi.fn(),
}));

vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/stores/configs', () => ({ configsStore: configsStoreMock }));
vi.mock('@/utils/clipboard', () => ({ copyToClipboard: copyMock }));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ children, title, isLoading }: any) => (
    <div data-testid="page-layout">
      <h1>{title}</h1>
      {isLoading && <div data-testid="loading" />}
      {children}
    </div>
  ),
}));
vi.mock('@/components/table', () => ({
  Table: ({ children }: any) => <table><tbody>{children}</tbody></table>,
  TableRow: ({ children, isHeading, url, ...rest }: any) =>
    isHeading
      ? <tr data-testid="heading-row">{children}</tr>
      : <tr data-testid="config-row" data-url={url} aria-label={rest['aria-label']}>{children}</tr>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));
vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: any) => <span>{children}</span>,
}));

function makeConfig(overrides: Record<string, any> = {}) {
  return {
    title: 'Test Config',
    description: '',
    editor: '',
    schemaPath: '/etc/wb/test.conf',
    configPath: '/etc/wb/test.conf',
    titleTranslations: {},
    ...overrides,
  };
}

describe('ConfigsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configsStoreMock.configs = [];
    authStoreMock.hasRights.mockReturnValue(true);
  });

  test('renders page title', () => {
    render(<ConfigsPage />);
    expect(screen.getByRole('heading')).toHaveTextContent('configurations.title');
  });

  test('calls getList on mount', () => {
    render(<ConfigsPage />);
    expect(configsStoreMock.getList).toHaveBeenCalled();
  });

  test('does not call getList without admin rights', () => {
    authStoreMock.hasRights.mockReturnValue(false);
    render(<ConfigsPage />);
    expect(configsStoreMock.getList).not.toHaveBeenCalled();
  });

  test('shows loading when no configs', () => {
    render(<ConfigsPage />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  test('hides loading when configs loaded', () => {
    configsStoreMock.configs = [makeConfig()];
    render(<ConfigsPage />);
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });

  test('renders heading row with title and file columns', () => {
    render(<ConfigsPage />);
    expect(screen.getByTestId('heading-row')).toBeInTheDocument();
    expect(screen.getByText('configurations.labels.title')).toBeInTheDocument();
    expect(screen.getByText('configurations.labels.file')).toBeInTheDocument();
  });

  test('renders config rows', () => {
    configsStoreMock.configs = [
      makeConfig({ title: 'Config A', configPath: '/a.conf' }),
      makeConfig({ title: 'Config B', configPath: '/b.conf' }),
    ];
    render(<ConfigsPage />);
    const rows = screen.getAllByTestId('config-row');
    expect(rows).toHaveLength(2);
    expect(screen.getByText('Config A')).toBeInTheDocument();
    expect(screen.getByText('Config B')).toBeInTheDocument();
  });

  test('renders config path', () => {
    configsStoreMock.configs = [makeConfig({ configPath: '/etc/wb/test.conf' })];
    render(<ConfigsPage />);
    expect(screen.getByText('/etc/wb/test.conf')).toBeInTheDocument();
  });

  test('encodes slashes in schema path URL', () => {
    configsStoreMock.configs = [
      makeConfig({ editor: '', schemaPath: '/etc/wb/test.conf' }),
    ];
    render(<ConfigsPage />);
    expect(screen.getByTestId('config-row')).toHaveAttribute(
      'data-url',
      '/settings/configs/~2Fetc~2Fwb~2Ftest.conf',
    );
  });

  test('uses editor route when editor is set', () => {
    configsStoreMock.configs = [makeConfig({ editor: 'mbgate' })];
    render(<ConfigsPage />);
    expect(screen.getByTestId('config-row')).toHaveAttribute(
      'data-url',
      '/settings/configs/mbgate',
    );
  });

  test('copies path to clipboard on click', () => {
    configsStoreMock.configs = [makeConfig({ configPath: '/etc/wb/test.conf' })];
    render(<ConfigsPage />);
    fireEvent.click(screen.getByText('/etc/wb/test.conf').closest('.configs-itemPath')!);
    expect(copyMock).toHaveBeenCalledWith('/etc/wb/test.conf');
  });

  test('uses titleTranslations when available', () => {
    configsStoreMock.configs = [
      makeConfig({ title: 'Default', titleTranslations: { en: 'Translated' } }),
    ];
    render(<ConfigsPage />);
    expect(screen.getByText('Translated')).toBeInTheDocument();
  });

  test('falls back to title when no translation', () => {
    configsStoreMock.configs = [
      makeConfig({ title: 'Fallback', titleTranslations: {} }),
    ];
    render(<ConfigsPage />);
    expect(screen.getByText('Fallback')).toBeInTheDocument();
  });

  test('sets aria-label on config row', () => {
    configsStoreMock.configs = [
      makeConfig({ title: 'My Config', titleTranslations: {} }),
    ];
    render(<ConfigsPage />);
    expect(screen.getByTestId('config-row')).toHaveAttribute(
      'aria-label',
      'My Config',
    );
  });
});
