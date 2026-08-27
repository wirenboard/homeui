// @vitest-environment happy-dom
// The import resolver handed to the language service: it goes through
// Editor.ResolveModule only when the controller advertises the method, and
// the advertisement check never delays the service itself (a negative
// answer takes the full advertisement timeout - firmware with GetTypes but
// without ResolveModule is the firmware in the field).
import { act, render, waitFor } from '@testing-library/react';
import EditRulePage from './edit-rule';

const { rulesMock, paramsMock, getExtensionsMock, loadTsSupportMock } = vi.hoisted(() => ({
  rulesMock: {
    rule: {
      name: 'test-rule.js',
      initName: 'test-rule.js',
      content: 'import { x } from "mod";',
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

// the resolver argument of the last loadTsEditorSupport call
const lastResolver = () => loadTsSupportMock.mock.calls.at(-1)![4] as (f: string, s: string) => Promise<unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  paramsMock['*'] = 'test-rule.js';
  rulesMock.load.mockResolvedValue(undefined);
  getExtensionsMock.mockReturnValue([]);
  editorProxyMock.GetTypes.mockResolvedValue({ content: 'declare const t: 1;' });
  loadTsSupportMock.mockResolvedValue({
    extensions: [],
    completionSource: () => null,
    getDiagnostics: () => [],
    reseed: () => {},
    refreshImports: async () => false,
  });
});

describe('the import resolver passed to the language service', () => {
  test('GetTypes without ResolveModule: the service builds without waiting, the resolver answers null', async () => {
    let answerResolveModule: (has: boolean) => void = () => {};
    editorProxyMock.hasMethod.mockImplementation((m?: string) => (m === 'ResolveModule'
      ? new Promise<boolean>((resolve) => {
        answerResolveModule = resolve;
      })
      : Promise.resolve(true)));
    render(<EditRulePage />);
    // the service is built while the ResolveModule advertisement is still unanswered
    await waitFor(() => expect(loadTsSupportMock).toHaveBeenCalled());
    const pending = lastResolver()('test-rule.js', 'mod');
    answerResolveModule(false);
    expect(await pending).toBeNull();
    expect(editorProxyMock.ResolveModule).not.toHaveBeenCalled();
  });

  test('advertising firmware: the resolver calls Editor.ResolveModule and maps a failure to null', async () => {
    editorProxyMock.hasMethod.mockResolvedValue(true);
    editorProxyMock.ResolveModule.mockResolvedValueOnce({ path: '/etc/wb-rules-modules/mod.js', content: 'export {}' });
    render(<EditRulePage />);
    await waitFor(() => expect(loadTsSupportMock).toHaveBeenCalled());
    await act(async () => {});
    expect(await lastResolver()('test-rule.js', 'mod'))
      .toEqual({ path: '/etc/wb-rules-modules/mod.js', content: 'export {}' });
    expect(editorProxyMock.ResolveModule).toHaveBeenCalledWith({ from: 'test-rule.js', specifier: 'mod' });
    editorProxyMock.ResolveModule.mockRejectedValueOnce({ code: 1003, message: 'cannot find module' });
    expect(await lastResolver()('test-rule.js', 'nope')).toBeNull();
  });
});
