// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@/test/render';
import MbGatePage from './mbgate';

const { storeMock } = vi.hoisted(() => ({
  storeMock: {
    paramsStore: { params: null } as any,
    error: null as string | null,
    isDirty: false,
    allowSave: false,
    additionalPorts: [] as any[],
    portConflicts: [] as number[][],
    loadData: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    getConfiguredControls: vi.fn().mockReturnValue([]),
    addControls: vi.fn(),
    checkAllControlsConfigured: vi.fn().mockReturnValue(false),
    addPort: vi.fn().mockReturnValue(0),
    removePort: vi.fn(),
  },
}));

function makeParams(modbus: Record<string, any> = { host: '*', port: 502 }) {
  return { modbus: { value: modbus }, registers: {}, debug: {}, mqtt: {} };
}

function makePort(modbus: Record<string, any>, name = '') {
  return { params: { name: { value: name }, modbus: { value: modbus }, registers: {} } };
}

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
vi.mock('@/components/confirm', () => ({
  Confirm: ({ isOpened, children, confirmCallback }: any) =>
    isOpened ? (
      <div data-testid="confirm-dialog">
        {children}
        <button data-testid="confirm-btn" onClick={confirmCallback}>OK</button>
      </div>
    ) : null,
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
    storeMock.additionalPorts = [];
    storeMock.portConflicts = [];
    storeMock.checkAllControlsConfigured.mockReturnValue(false);
    storeMock.addPort.mockReturnValue(0);
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

  test('renders main port and settings tabs when params loaded', () => {
    storeMock.paramsStore = { params: makeParams() };
    render(<MbGatePage />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent('mbgate.labels.main-port');
    expect(tabs[0]).toHaveTextContent('TCP *:502');
    expect(tabs[1]).toHaveTextContent('mbgate.labels.settings');
  });

  test('does not render tabs and add port button when no params', () => {
    render(<MbGatePage />);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByTestId('btn-mbgate.buttons.add-port')).not.toBeInTheDocument();
  });

  test('renders additional port tabs between main port and settings', () => {
    storeMock.paramsStore = { params: makeParams() };
    storeMock.additionalPorts = [makePort({ host: '*', port: 503 }, 'SCADA'), makePort({ path: '/dev/ttyRS485-2' })];
    render(<MbGatePage />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs[1]).toHaveTextContent('SCADA');
    expect(tabs[1]).toHaveTextContent('TCP *:503');
    expect(tabs[2]).toHaveTextContent('mbgate.labels.additional-port');
    expect(tabs[2]).toHaveTextContent('RTU /dev/ttyRS485-2');
    expect(tabs[3]).toHaveTextContent('mbgate.labels.settings');
  });

  test('add port button adds port and opens its tab', () => {
    storeMock.paramsStore = { params: makeParams() };
    storeMock.addPort.mockImplementation(() => {
      storeMock.additionalPorts = [makePort({ host: '*', port: 503 }, 'New')];
      return 0;
    });
    render(<MbGatePage />);
    fireEvent.click(screen.getByTestId('btn-mbgate.buttons.add-port'));
    expect(storeMock.addPort).toHaveBeenCalled();
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('New');
  });

  test('deletes additional port after confirmation', () => {
    storeMock.paramsStore = { params: makeParams() };
    storeMock.additionalPorts = [makePort({ host: '*', port: 503 }, 'SCADA')];
    render(<MbGatePage />);
    fireEvent.click(screen.getAllByRole('tab')[1]);
    fireEvent.click(screen.getByTestId('btn-mbgate.buttons.delete-port'));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-btn'));
    expect(storeMock.removePort).toHaveBeenCalledWith(0);
  });

  test('main port has no delete button', () => {
    storeMock.paramsStore = { params: makeParams() };
    render(<MbGatePage />);
    expect(screen.queryByTestId('btn-mbgate.buttons.delete-port')).not.toBeInTheDocument();
  });

  test('shows conflict error on conflicting port', () => {
    storeMock.paramsStore = { params: makeParams() };
    storeMock.additionalPorts = [makePort({ host: '*', port: 502 }, 'SCADA')];
    storeMock.portConflicts = [[1], [0]];
    render(<MbGatePage />);
    expect(screen.getByTestId('alert')).toHaveTextContent('mbgate.errors.port-conflict');
  });

  test('select controls dialog is closed initially', () => {
    render(<MbGatePage />);
    expect(screen.queryByTestId('select-controls')).not.toBeInTheDocument();
  });
});
