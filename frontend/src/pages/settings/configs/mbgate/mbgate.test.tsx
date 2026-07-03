// @vitest-environment happy-dom
import { render, screen } from '@/test/render';
import MbGatePage from './mbgate';

const { storeMock } = vi.hoisted(() => ({
  storeMock: {
    paramsStore: { params: null } as any,
    error: null as string | null,
    isDirty: false,
    allowSave: false,
    loadData: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    getConfiguredControls: vi.fn().mockReturnValue([]),
    addControls: vi.fn(),
    checkAllControlsConfigured: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('@/utils/use-store', () => ({ useStore: () => storeMock }));
vi.mock('@/utils/prevent-page-leave', () => ({
  usePreventLeavePage: () => ({ setIsDirty: vi.fn() }),
}));
vi.mock('@/utils/async-action', () => ({
  useAsyncAction: (fn: any) => [fn, false],
}));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/stores/configs', () => ({ configsStore: {} }));
vi.mock('@/stores/devices', () => ({ devicesStore: {} }));
vi.mock('@/common/links', () => ({ documentation: { en: { mbgate: '#mbgate' } } }));
vi.mock('@/common/paths', () => ({ mbgatePath: '/mbgate' }));
vi.mock('@/layouts/page', () => ({
  PageLayout: ({ children, title, errors, actions, isLoading }: any) => (
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
  Button: ({ label, onClick, disabled }: any) => (
    <button data-testid={`btn-${label}`} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  ),
}));
vi.mock('@/components/alert', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
}));
vi.mock('@/components/form', () => ({
  StringField: ({ value }: any) => <input data-testid="string-field" value={value} readOnly />,
}));
vi.mock('@/components/json-editor/forms', () => ({
  CustomEditorBuilderContext: { Provider: ({ children }: any) => <>{children}</> },
  ShowParamCaptionContext: { Provider: ({ children }: any) => <>{children}</> },
  Form: ({ store }: any) => <div data-testid="json-form">{store ? 'form' : null}</div>,
  MakeFormFields: () => null,
  makeParameterStoreFromJsonSchema: vi.fn(),
}));
vi.mock('./components/select-controls', () => ({
  SelectControls: ({ isOpen }: any) =>
    isOpen ? <div data-testid="select-controls" /> : null,
}));

describe('MbGatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMock.paramsStore = { params: null };
    storeMock.error = null;
    storeMock.isDirty = false;
    storeMock.allowSave = false;
    storeMock.checkAllControlsConfigured.mockReturnValue(false);
  });

  test('renders page title', () => {
    render(<MbGatePage />);
    expect(screen.getByRole('heading')).toHaveTextContent('mbgate.title');
  });

  test('calls loadData on mount', () => {
    render(<MbGatePage />);
    expect(storeMock.loadData).toHaveBeenCalled();
  });

  test('renders save button', () => {
    render(<MbGatePage />);
    expect(screen.getByTestId('btn-mbgate.buttons.save')).toBeInTheDocument();
  });

  test('disables save button when allowSave is false', () => {
    render(<MbGatePage />);
    expect(screen.getByTestId('btn-mbgate.buttons.save')).toBeDisabled();
  });

  test('shows error when store.error is set', () => {
    storeMock.error = 'Something went wrong';
    render(<MbGatePage />);
    expect(screen.getByTestId('page-error')).toHaveTextContent('Something went wrong');
  });

  test('no error when store.error is null', () => {
    render(<MbGatePage />);
    expect(screen.queryByTestId('page-error')).not.toBeInTheDocument();
  });

  test('renders form when paramsStore has params', () => {
    storeMock.paramsStore = { params: { registers: {} } };
    render(<MbGatePage />);
    expect(screen.getByTestId('json-form')).toBeInTheDocument();
  });

  test('does not render form when no params', () => {
    render(<MbGatePage />);
    expect(screen.queryByTestId('json-form')).not.toBeInTheDocument();
  });

  test('select controls dialog is closed initially', () => {
    render(<MbGatePage />);
    expect(screen.queryByTestId('select-controls')).not.toBeInTheDocument();
  });
});
