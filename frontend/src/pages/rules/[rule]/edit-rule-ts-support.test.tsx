// @vitest-environment happy-dom
// How the edit page decides whether to build the TypeScript language
// service: Editor.GetTypes doubles as the feature gate. Legacy firmware
// (method not advertised) gets a plain editor - building the service from
// the vendored declarations would advertise APIs the installed engine
// does not have. On advertising firmware a failed GetTypes call is
// transient and falls back to the vendored declarations. A service init
// that resolves after navigating away must not leak into the page.
import { act, render, waitFor } from '@testing-library/react';
import EditRulePage from './edit-rule';

const { rulesMock, paramsMock, getExtensionsMock, loadTsSupportMock } = vi.hoisted(() => ({
  rulesMock: {
    rule: {
      name: 'test-rule.js',
      initName: 'test-rule.js',
      content: 'defineRule("test", {})',
      enabled: true,
      error: null as any,
    },
    load: vi.fn(async () => {}),
    save: vi.fn(async () => 'test-rule.js'),
    rename: vi.fn(async () => 'renamed.js'),
    resetRule: vi.fn(),
    setRule: vi.fn(),
    setRuleName: vi.fn(),
    checkIsNameUnique: vi.fn(async () => true),
    tsCheckDiags: [],
    checkTsFile: vi.fn(async () => {}),
    clearTsCheck: vi.fn(),
  },
  paramsMock: { '*': 'test-rule.js' } as Record<string, string | undefined>,
  getExtensionsMock: vi.fn(() => [] as any[]),
  loadTsSupportMock: vi.fn(),
}));

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/rules', () => ({ rulesStore: rulesMock }));
vi.mock('@/stores/rules/autocomplete', () => ({ getExtensions: getExtensionsMock }));
vi.mock('@/stores/rules/autocomplete/ts-language-service', () => ({
  loadTsEditorSupport: loadTsSupportMock,
}));
vi.mock('@/stores/auth', () => ({
  authStore: { hasRights: vi.fn(() => true) },
  UserRole: { Admin: 'admin' },
}));
vi.mock('@/stores/devices', () => ({ devicesStore: {} }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useParams: () => paramsMock,
    useNavigate: () => vi.fn(),
  };
});
vi.mock('@/common/links', () => ({
  documentation: { en: { rule: '#rule-docs' } },
}));
vi.mock('@/utils/prevent-page-leave', () => ({
  usePreventLeavePage: () => ({ setIsDirty: vi.fn() }),
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, onClick }: any) => <button onClick={onClick}>{label}</button>,
}));
vi.mock('@/components/code-editor', () => ({
  CodeEditor: () => <div data-testid="code-editor" />,
}));
vi.mock('@/components/tag', () => ({
  Tag: ({ children }: any) => <span>{children}</span>,
}));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ children, actions }: any) => <div>{actions}{children}</div>,
}));

const { editorProxyMock } = await import('@/test/mocks/services');

beforeEach(() => {
  vi.clearAllMocks();
  paramsMock['*'] = 'test-rule.js';
  rulesMock.load.mockResolvedValue(undefined);
  getExtensionsMock.mockReturnValue([]);
  loadTsSupportMock.mockResolvedValue({
    extensions: [],
    completionSource: () => null,
    getDiagnostics: () => [],
    reseed: () => {},
  });
});

describe('language service gating on Editor.GetTypes', () => {
  test('legacy firmware (method not advertised): no GetTypes call, no language service - a plain editor', async () => {
    editorProxyMock.hasMethod.mockResolvedValue(false);
    render(<EditRulePage />);
    await waitFor(() => expect(editorProxyMock.hasMethod).toHaveBeenCalledWith('GetTypes'));
    await act(async () => {});
    expect(editorProxyMock.GetTypes).not.toHaveBeenCalled();
    expect(loadTsSupportMock).not.toHaveBeenCalled();
  });

  test('advertising firmware: the service is seeded with the controller-reported declarations', async () => {
    editorProxyMock.hasMethod.mockResolvedValue(true);
    editorProxyMock.GetTypes.mockResolvedValue({ content: 'declare const controllerTypes: 1;' });
    render(<EditRulePage />);
    await waitFor(() => expect(loadTsSupportMock).toHaveBeenCalled());
    expect(loadTsSupportMock).toHaveBeenCalledWith(
      'test-rule.js',
      'defineRule("test", {})',
      'declare const controllerTypes: 1;',
      expect.any(String),
    );
  });

  test('advertising firmware, failing GetTypes call: the service builds on the vendored fallback', async () => {
    editorProxyMock.hasMethod.mockResolvedValue(true);
    editorProxyMock.GetTypes.mockRejectedValue({ data: 'MqttTimeoutError' });
    render(<EditRulePage />);
    await waitFor(() => expect(loadTsSupportMock).toHaveBeenCalled());
    expect(loadTsSupportMock).toHaveBeenCalledWith(
      'test-rule.js',
      'defineRule("test", {})',
      undefined,
      expect.any(String),
    );
  });

  test('a service init resolving after navigation away is dropped and never rendered', async () => {
    editorProxyMock.hasMethod.mockResolvedValue(true);
    editorProxyMock.GetTypes.mockResolvedValue({ content: 'declare const x: 1;' });
    let resolveSupport: (v: any) => void = () => {};
    loadTsSupportMock.mockImplementation(() => new Promise((resolve) => {
      resolveSupport = resolve;
    }));
    const { unmount } = render(<EditRulePage />);
    await waitFor(() => expect(loadTsSupportMock).toHaveBeenCalled());
    unmount();
    resolveSupport({
      extensions: [],
      completionSource: () => null,
      getDiagnostics: () => [],
      reseed: () => {},
    });
    await act(async () => {});
    for (const call of getExtensionsMock.mock.calls) {
      expect((call as any[])[1]?.typeAwareSource).toBeUndefined();
    }
  });
});
