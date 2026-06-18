// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditRulePage from './edit-rule';

const { rulesMock, navigateMock, paramsMock, setIsDirtyMock } = vi.hoisted(() => ({
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
  },
  navigateMock: vi.fn(),
  paramsMock: { id: 'test-rule.js' } as Record<string, string | undefined>,
  setIsDirtyMock: vi.fn(),
}));

vi.mock('@/stores/rules', () => ({ rulesStore: rulesMock }));
vi.mock('@/stores/rules/autocomplete', () => ({ getExtensions: () => [] }));
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
    useNavigate: () => navigateMock,
  };
});
vi.mock('@/common/links', () => ({
  documentation: { en: { rule: '#rule-docs' } },
}));
vi.mock('@/utils/async-action', () => ({
  useAsyncAction: (fn: any) => [fn, false],
}));
vi.mock('@/utils/prevent-page-leave', () => ({
  usePreventLeavePage: () => ({ setIsDirty: setIsDirtyMock }),
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, disabled, onClick }: any) => (
    <button disabled={disabled} onClick={onClick}>{label}</button>
  ),
}));
vi.mock('@/components/code-editor', () => ({
  CodeEditor: ({ text, onChange, onSave, errorLines }: any) => (
    <div data-testid="code-editor">
      <textarea
        data-testid="code-textarea"
        value={text || ''}
        onChange={(e: any) => onChange(e.target.value)}
      />
      {errorLines && <span data-testid="error-lines">{JSON.stringify(errorLines)}</span>}
      <button data-testid="code-save" onClick={onSave}>save</button>
    </div>
  ),
}));
vi.mock('@/components/tag', () => ({
  Tag: ({ children }: any) => <span data-testid="tag">{children}</span>,
}));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({
    title, errors, actions, isLoading, titleArea, isEditingTitle,
    onTitleChange, onTitleEditEnable, children,
  }: any) => (
    <div>
      {isLoading && <div data-testid="loading">loading</div>}
      <h1 data-testid="title" onClick={onTitleEditEnable}>{title}</h1>
      {isEditingTitle && (
        <input
          data-testid="title-input"
          onChange={(e: any) => onTitleChange(e.target.value)}
        />
      )}
      {titleArea}
      <div data-testid="actions">{actions}</div>
      {errors?.map((e: any, i: number) => (
        <div key={i} data-testid="error">{e.text || `error-${e.code}`}</div>
      ))}
      {children}
    </div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  paramsMock.id = 'test-rule.js';
  rulesMock.rule.name = 'test-rule.js';
  rulesMock.rule.initName = 'test-rule.js';
  rulesMock.rule.content = 'defineRule("test", {})';
  rulesMock.rule.enabled = true;
  rulesMock.rule.error = null;
  rulesMock.load.mockResolvedValue(undefined);
  rulesMock.save.mockResolvedValue('test-rule.js');
});

describe('EditRulePage', () => {
  test('loads rule on mount when params.id exists', () => {
    render(<EditRulePage />);
    expect(rulesMock.load).toHaveBeenCalledWith('test-rule.js');
  });

  test('shows loading state while rule loads', () => {
    rulesMock.load.mockReturnValue(new Promise(() => {}));
    render(<EditRulePage />);
    expect(screen.getByTestId('loading')).toBeDefined();
  });

  test('hides loading after rule loads', async () => {
    render(<EditRulePage />);
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
    });
  });

  test('renders rule title', async () => {
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByTestId('title').textContent).toBe('test-rule.js');
  });

  test('resets rule for new rule (no params.id)', () => {
    paramsMock.id = undefined;
    render(<EditRulePage />);
    expect(rulesMock.resetRule).toHaveBeenCalled();
    expect(rulesMock.load).not.toHaveBeenCalled();
  });

  test('shows title input for new rule', () => {
    paramsMock.id = undefined;
    render(<EditRulePage />);
    expect(screen.getByTestId('title-input')).toBeDefined();
  });

  test('hides title input for existing rule', async () => {
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.queryByTestId('title-input')).toBeNull();
  });

  test('toggles title editing on title click', async () => {
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    fireEvent.click(screen.getByTestId('title'));
    expect(screen.getByTestId('title-input')).toBeDefined();
  });

  test('renders code editor with rule content', async () => {
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    const textarea = screen.getByTestId('code-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('defineRule("test", {})');
  });

  test('code change calls setRule and marks dirty', async () => {
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    fireEvent.change(screen.getByTestId('code-textarea'), {
      target: { value: 'new code' },
    });
    expect(rulesMock.setRule).toHaveBeenCalledWith('new code');
    expect(setIsDirtyMock).toHaveBeenCalledWith(true);
  });

  test('title change calls setRuleName', () => {
    paramsMock.id = undefined;
    render(<EditRulePage />);
    fireEvent.change(screen.getByTestId('title-input'), {
      target: { value: 'new-name' },
    });
    expect(rulesMock.setRuleName).toHaveBeenCalledWith('new-name');
  });

  test('save button disabled when no rule name', async () => {
    rulesMock.rule.name = '';
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    const btn = screen.getByText('rules.buttons.save') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  test('save button enabled when rule has name', async () => {
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    const btn = screen.getByText('rules.buttons.save') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  test('save existing rule without rename', async () => {
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    fireEvent.click(screen.getByText('rules.buttons.save'));
    await waitFor(() => {
      expect(rulesMock.save).toHaveBeenCalledWith(rulesMock.rule);
      expect(navigateMock).not.toHaveBeenCalled();
      expect(setIsDirtyMock).toHaveBeenCalledWith(false);
    });
  });

  test('save new rule navigates to edit path', async () => {
    paramsMock.id = undefined;
    rulesMock.save.mockResolvedValue('new-rule.js');
    render(<EditRulePage />);
    fireEvent.click(screen.getByText('rules.buttons.save'));
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        '/rules/edit/new-rule.js', { replace: true },
      );
    });
  });

  test('save with rename checks uniqueness and navigates', async () => {
    rulesMock.rule.name = 'renamed.js';
    rulesMock.rename.mockResolvedValue('renamed.js');
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    fireEvent.click(screen.getByText('rules.buttons.save'));
    await waitFor(() => {
      expect(rulesMock.checkIsNameUnique).toHaveBeenCalledWith('renamed.js');
      expect(rulesMock.rename).toHaveBeenCalledWith('test-rule.js', 'renamed.js');
      expect(navigateMock).toHaveBeenCalledWith(
        '/rules/edit/renamed.js', { replace: true },
      );
    });
  });

  test('shows inactive tag when rule not enabled', async () => {
    rulesMock.rule.enabled = false;
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByTestId('tag').textContent).toBe('rules.labels.inactive');
  });

  test('hides inactive tag when rule enabled', async () => {
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.queryByTestId('tag')).toBeNull();
  });

  test('shows error message from rule.error', async () => {
    rulesMock.rule.error = { message: 'Syntax error at line 5' };
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByText('Syntax error at line 5')).toBeDefined();
  });

  test('shows 404 error on load failure', async () => {
    rulesMock.load.mockRejectedValue({ data: 'EditorError' });
    render(<EditRulePage />);
    await waitFor(() => {
      expect(screen.getByText('error-404')).toBeDefined();
    });
  });

  test('passes error lines to code editor', async () => {
    rulesMock.rule.error = { message: 'err', errorLine: 10 };
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByTestId('error-lines').textContent).toBe('[10]');
  });

  test('code editor save triggers save handler', async () => {
    render(<EditRulePage />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    fireEvent.click(screen.getByTestId('code-save'));
    await waitFor(() => {
      expect(rulesMock.save).toHaveBeenCalledWith(rulesMock.rule);
    });
  });
});
