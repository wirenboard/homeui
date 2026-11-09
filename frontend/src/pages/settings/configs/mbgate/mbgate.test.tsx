// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@/test/render';
import MbGatePage from './mbgate';

const { storeMock } = vi.hoisted(() => ({
  storeMock: {
    paramsStore: { params: null } as any,
    error: null as string | null,
    isDirty: false,
    allowSave: false,
    supportsAdditionalPorts: false,
    additionalPorts: [] as any[],
    portBindings: [] as any[],
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

function makeParams() {
  return { modbus: {}, registers: {}, debug: {}, mqtt: {}, additional_ports: {} };
}

function makePort(name = '') {
  return { params: { name: { value: name }, modbus: {}, registers: {} } };
}

// Sets loaded params with main port bound to TCP *:502 and given additional ports
function setPorts(...ports: { name?: string; binding: Record<string, any> }[]) {
  storeMock.paramsStore = { params: makeParams() };
  storeMock.supportsAdditionalPorts = true;
  storeMock.additionalPorts = ports.map((port) => makePort(port.name));
  storeMock.portBindings = [{ isRtu: false, host: '*', port: 502 }, ...ports.map((port) => port.binding)];
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
    storeMock.supportsAdditionalPorts = false;
    storeMock.additionalPorts = [];
    storeMock.portBindings = [];
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
    setPorts();
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
    setPorts(
      { name: 'SCADA', binding: { isRtu: false, host: '*', port: 503 } },
      { binding: { isRtu: true, path: '/dev/ttyRS485-2' } },
      { binding: { isRtu: true } },
    );
    render(<MbGatePage />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(tabs[1]).toHaveTextContent('SCADA');
    expect(tabs[1]).toHaveTextContent('TCP *:503');
    expect(tabs[2]).toHaveTextContent('mbgate.labels.additional-port');
    expect(tabs[2]).toHaveTextContent('RTU /dev/ttyRS485-2');
    expect(tabs[3]).toHaveTextContent('RTU');
    expect(tabs[3]).not.toHaveTextContent('TCP');
    expect(tabs[4]).toHaveTextContent('mbgate.labels.settings');
  });

  test('hides add port button when schema has no additional ports', () => {
    storeMock.paramsStore = { params: makeParams() };
    render(<MbGatePage />);
    expect(screen.queryByTestId('btn-mbgate.buttons.add-port')).not.toBeInTheDocument();
  });

  test('add port button adds port and opens its tab', () => {
    setPorts();
    storeMock.addPort.mockImplementation(() => {
      storeMock.additionalPorts = [makePort('New')];
      return 0;
    });
    render(<MbGatePage />);
    fireEvent.click(screen.getByTestId('btn-mbgate.buttons.add-port'));
    expect(storeMock.addPort).toHaveBeenCalled();
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('New');
  });

  test('deletes additional port after confirmation', () => {
    setPorts({ name: 'SCADA', binding: { isRtu: false, host: '*', port: 503 } });
    render(<MbGatePage />);
    fireEvent.click(screen.getAllByRole('tab')[1]);
    fireEvent.click(screen.getByTestId('btn-mbgate.buttons.delete-port'));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-btn'));
    expect(storeMock.removePort).toHaveBeenCalledWith(0);
  });

  test('main port has no delete button', () => {
    setPorts();
    render(<MbGatePage />);
    expect(screen.queryByTestId('btn-mbgate.buttons.delete-port')).not.toBeInTheDocument();
  });

  test('shows conflict error on conflicting port', () => {
    setPorts({ name: 'SCADA', binding: { isRtu: false, host: '*', port: 502 } });
    storeMock.portConflicts = [[1], [0]];
    render(<MbGatePage />);
    expect(screen.getByTestId('alert')).toHaveTextContent('mbgate.errors.port-conflict');
  });

  test('select controls dialog is closed initially', () => {
    render(<MbGatePage />);
    expect(screen.queryByTestId('select-controls')).not.toBeInTheDocument();
  });
});
