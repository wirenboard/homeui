// @vitest-environment happy-dom
import { Route, Routes } from 'react-router-dom';
import { authStoreMock } from '@/test/mocks/auth-store';
import { render, screen, fireEvent, waitFor } from '@/test/render';
import ConfigPage from './config';

const { configsStoreMock, devicesStoreMock, preventLeaveMock } = vi.hoisted(() => ({
  configsStoreMock: {
    config: null as any,
    path: '',
    getConfig: vi.fn().mockResolvedValue(undefined),
    clearConfig: vi.fn(),
    setContent: vi.fn(),
    saveConfig: vi.fn().mockResolvedValue(undefined),
  },
  devicesStoreMock: {
    topicsWithoutSystem: ['dev/ctrl'],
  },
  preventLeaveMock: {
    isDirty: false,
    setIsDirty: vi.fn(),
  },
}));

vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/stores/configs', () => ({ configsStore: configsStoreMock }));
vi.mock('@/stores/devices', () => ({ devicesStore: devicesStoreMock }));
vi.mock('@/utils/async-action', () => ({
  useAsyncAction: (fn: any) => [fn, false],
}));
vi.mock('@/utils/prevent-page-leave', () => ({
  usePreventLeavePage: () => preventLeaveMock,
}));
vi.mock('@/common/links', () => ({ documentation: {} }));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ children, title, isLoading, errors, actions }: any) => (
    <div data-testid="page-layout">
      <h1>{title}</h1>
      {isLoading && <div data-testid="loading" />}
      {errors?.map((e: any, i: number) => (
        <div key={i} data-testid="page-error">{e.text}</div>
      ))}
      <div data-testid="actions">{actions}</div>
      {children}
    </div>
  ),
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, disabled, onClick }: any) => (
    <button data-testid="save-btn" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  ),
}));
vi.mock('@/components/json-editor', () => ({
  JsonEditor: ({ schema, cells, onChange }: any) => (
    <div
      data-testid="json-editor"
      data-schema={JSON.stringify(schema)}
      data-cells={JSON.stringify(cells)}
    >
      <button
        data-testid="trigger-change"
        onClick={() => onChange({ changed: true }, [])}
      />
      <button
        data-testid="trigger-invalid"
        onClick={() => onChange({ changed: true }, ['err'])}
      />
    </div>
  ),
}));

function renderPage(id = '~2Fetc~2Fwb~2Ftest.conf') {
  return render(
    <Routes>
      <Route path="/settings/configs/:id" element={<ConfigPage />} />
    </Routes>,
    { initialEntries: [`/settings/configs/${id}`] },
  );
}

describe('ConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configsStoreMock.config = {
      configPath: '/etc/wb/test.conf',
      schema: { type: 'object' },
      content: { key: 'value' },
    };
    configsStoreMock.path = '/etc/wb/test.conf';
    preventLeaveMock.isDirty = false;
    authStoreMock.hasRights.mockReturnValue(true);
  });

  test('renders page title from config path', () => {
    renderPage();
    expect(screen.getByRole('heading')).toHaveTextContent('/etc/wb/test.conf');
  });

  test('calls getConfig with decoded path on mount', () => {
    renderPage('~2Fetc~2Fwb~2Ftest.conf');
    expect(configsStoreMock.getConfig).toHaveBeenCalledWith('/etc/wb/test.conf');
  });

  test('decodes ~2F to /', () => {
    renderPage('~2Fetc~2Fwb~2Fmy~2Fconfig.conf');
    expect(configsStoreMock.getConfig).toHaveBeenCalledWith(
      '/etc/wb/my/config.conf',
    );
  });

  test('prepends / when path has no leading slash', () => {
    renderPage('etc~2Fwb~2Ftest.conf');
    expect(configsStoreMock.getConfig).toHaveBeenCalledWith('/etc/wb/test.conf');
  });

  test('calls clearConfig on unmount', () => {
    const { unmount } = renderPage();
    unmount();
    expect(configsStoreMock.clearConfig).toHaveBeenCalled();
  });

  test('renders save button', () => {
    renderPage();
    expect(screen.getByTestId('save-btn')).toHaveTextContent(
      'configurations.buttons.save',
    );
  });

  test('save button disabled when not dirty', () => {
    preventLeaveMock.isDirty = false;
    renderPage();
    expect(screen.getByTestId('save-btn')).toBeDisabled();
  });

  test('save button enabled when dirty and valid', () => {
    preventLeaveMock.isDirty = true;
    renderPage();
    expect(screen.getByTestId('save-btn')).not.toBeDisabled();
  });

  test('renders JsonEditor with schema and cells', () => {
    renderPage();
    const editor = screen.getByTestId('json-editor');
    expect(editor).toHaveAttribute(
      'data-schema',
      JSON.stringify({ type: 'object' }),
    );
    expect(editor).toHaveAttribute('data-cells', JSON.stringify(['dev/ctrl']));
  });

  test('shows load error', async () => {
    configsStoreMock.getConfig.mockRejectedValue({
      message: 'Not found',
      data: '404',
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('page-error')).toHaveTextContent(
        'configurations.errors.load',
      );
    });
  });

  test('save calls saveConfig and clears dirty', async () => {
    preventLeaveMock.isDirty = true;
    renderPage();
    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => {
      expect(configsStoreMock.saveConfig).toHaveBeenCalled();
      expect(preventLeaveMock.setIsDirty).toHaveBeenCalledWith(false);
    });
  });

  test('save error shows message', async () => {
    preventLeaveMock.isDirty = true;
    configsStoreMock.saveConfig.mockRejectedValue(new Error('fail'));
    renderPage();
    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('page-error')).toHaveTextContent(
        'configurations.errors.save',
      );
    });
  });

  test('save error sets isDirty', async () => {
    preventLeaveMock.isDirty = true;
    configsStoreMock.saveConfig.mockRejectedValue(new Error('fail'));
    renderPage();
    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => {
      expect(preventLeaveMock.setIsDirty).toHaveBeenCalledWith(true);
    });
  });

  test('onChange calls setContent when content differs', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('trigger-change'));
    expect(configsStoreMock.setContent).toHaveBeenCalledWith({
      changed: true,
    });
    expect(preventLeaveMock.setIsDirty).toHaveBeenCalledWith(true);
  });

  test('onChange skips when path does not match store', () => {
    configsStoreMock.path = '/different/path';
    renderPage();
    fireEvent.click(screen.getByTestId('trigger-change'));
    expect(configsStoreMock.setContent).not.toHaveBeenCalled();
  });

  test('onChange skips when config has no content', () => {
    configsStoreMock.config = {
      configPath: '/etc/wb/test.conf',
      schema: {},
      content: null,
    };
    renderPage();
    fireEvent.click(screen.getByTestId('trigger-change'));
    expect(configsStoreMock.setContent).not.toHaveBeenCalled();
  });
});
