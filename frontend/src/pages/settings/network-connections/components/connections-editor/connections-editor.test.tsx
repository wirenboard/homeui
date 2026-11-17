// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@/test/render';
import { ConnectionState, NetworkType } from '../../stores/types';
import { ConnectionsEditor } from './connections-editor';

const { useTabsMock, setActiveTabMock } = vi.hoisted(() => ({
  setActiveTabMock: vi.fn(),
  useTabsMock: vi.fn(() => ({
    activeTab: '0',
    setActiveTab: setActiveTabMock,
    onTabChange: vi.fn(),
  })),
}));

vi.mock('@/components/tabs', () => ({
  Tabs: ({ items }: any) => (
    <div data-testid="tabs">
      {items?.map((i: any, idx: number) => <div key={idx} data-testid={`tab-${idx}`}>{i.label}</div>)}
    </div>
  ),
  TabContent: ({ children, activeTab, tabId }: any) =>
    activeTab === tabId ? <div data-testid={`tab-content-${tabId}`}>{children}</div> : null,
  useTabs: useTabsMock,
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, onClick, disabled, isLoading, ...rest }: any) => (
    <button disabled={disabled} data-loading={isLoading} onClick={onClick} {...rest}>
      {rest.icon}{label}
    </button>
  ),
}));
vi.mock('@/components/confirm', () => ({
  Confirm: ({ isOpened, heading, confirmCallback, closeCallback, children }: any) =>
    isOpened ? (
      <div data-testid="confirm-dialog">
        <span>{heading}</span>
        <div>{children}</div>
        <button data-testid="confirm-accept" onClick={confirmCallback}>accept</button>
        <button data-testid="confirm-close" onClick={closeCallback}>close</button>
      </div>
    ) : null,
}));
vi.mock('@/components/input', () => ({
  Input: ({ value, onChange, isInvalid }: any) => (
    <input
      value={value}
      data-invalid={isInvalid}
      data-testid="connection-name-input"
      onChange={(e: any) => onChange(e.target.value)}
    />
  ),
}));
vi.mock('@/components/json-editor', () => ({
  JsonEditor: ({ root }: any) => <div data-testid={`json-editor-${root}`} />,
}));
vi.mock('@/utils/async-action', () => ({
  useAsyncAction: (fn: any) => [fn, false],
}));
vi.mock('@/assets/icons/plus.svg', () => ({ default: () => null }));
vi.mock('../connection-item', () => ({
  ConnectionItem: ({ connection }: any) => <span data-testid="connection-item">{connection.name}</span>,
}));
vi.mock('../create-connection-modal', () => ({
  CreateConnectionModal: ({ isOpened, onCreate, onClose }: any) =>
    isOpened ? (
      <div data-testid="create-modal">
        <button data-testid="create-confirm" onClick={() => onCreate(NetworkType.Ethernet)}>create</button>
        <button data-testid="create-close" onClick={onClose}>close</button>
      </div>
    ) : null,
}));

function makeConnection(overrides: Record<string, any> = {}) {
  return {
    data: { type: NetworkType.Ethernet },
    state: ConnectionState.activated,
    name: 'Wired connection 1',
    description: 'network-connections.labels.activated',
    editedConnectionId: 'Wired connection 1',
    schema: {},
    isDirty: false,
    isNew: false,
    hasErrors: false,
    managedByNM: true,
    allowSwitchState: true,
    setConnectionId: vi.fn(),
    setEditedData: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function makeProps(overrides: Record<string, any> = {}) {
  return {
    connections: {
      connections: [makeConnection()],
    },
    onSelect: vi.fn().mockResolvedValue(0),
    onSave: vi.fn().mockResolvedValue(true),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onAdd: vi.fn().mockResolvedValue(1),
    onToggleState: vi.fn(),
    ...overrides,
  } as any;
}

describe('ConnectionsEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTabsMock.mockReturnValue({
      activeTab: '0',
      setActiveTab: setActiveTabMock,
      onTabChange: vi.fn(),
    });
  });

  test('renders connection tabs', () => {
    render(<ConnectionsEditor {...makeProps()} />);
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-0')).toBeInTheDocument();
  });

  test('renders add connection button', () => {
    render(<ConnectionsEditor {...makeProps()} />);
    expect(screen.getByText('network-connections.buttons.add-connection')).toBeInTheDocument();
  });

  test('renders connection name input for NM connections', () => {
    render(<ConnectionsEditor {...makeProps()} />);
    expect(screen.getByTestId('connection-name-input')).toBeInTheDocument();
  });

  test('does not render name input for non-NM connections', () => {
    const cn = makeConnection({ managedByNM: false });
    render(<ConnectionsEditor {...makeProps({ connections: { connections: [cn] } })} />);
    expect(screen.queryByTestId('connection-name-input')).not.toBeInTheDocument();
  });

  test('renders connect/disconnect button', () => {
    render(<ConnectionsEditor {...makeProps()} />);
    expect(screen.getByText('network-connections.buttons.disconnect')).toBeInTheDocument();
  });

  test('renders connect button for not-connected', () => {
    const cn = makeConnection({ state: 'not-connected' });
    render(<ConnectionsEditor {...makeProps({ connections: { connections: [cn] } })} />);
    expect(screen.getByText('network-connections.buttons.connect')).toBeInTheDocument();
  });

  test('renders json editor', () => {
    render(<ConnectionsEditor {...makeProps()} />);
    expect(screen.getByTestId('json-editor-cn0')).toBeInTheDocument();
  });

  test('renders delete button', () => {
    render(<ConnectionsEditor {...makeProps()} />);
    expect(screen.getByText('network-connections.buttons.delete')).toBeInTheDocument();
  });

  test('save button is disabled when not dirty', () => {
    render(<ConnectionsEditor {...makeProps()} />);
    const saveBtn = screen.getByText('network-connections.buttons.save');
    expect(saveBtn).toBeDisabled();
  });

  test('save button is enabled when dirty', () => {
    const cn = makeConnection({ isDirty: true });
    render(<ConnectionsEditor {...makeProps({ connections: { connections: [cn] } })} />);
    const saveBtn = screen.getByText('network-connections.buttons.save');
    expect(saveBtn).not.toBeDisabled();
  });

  test('cancel button is disabled for new connections', () => {
    const cn = makeConnection({ isDirty: true, isNew: true });
    render(<ConnectionsEditor {...makeProps({ connections: { connections: [cn] } })} />);
    const cancelBtn = screen.getByText('network-connections.buttons.cancel');
    expect(cancelBtn).toBeDisabled();
  });

  test('clicking delete opens confirm dialog', () => {
    render(<ConnectionsEditor {...makeProps()} />);
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('network-connections.buttons.delete'));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
  });

  test('clicking add opens create modal', () => {
    render(<ConnectionsEditor {...makeProps()} />);
    expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('network-connections.buttons.add-connection'));
    expect(screen.getByTestId('create-modal')).toBeInTheDocument();
  });

  test('calls onToggleState when connect/disconnect button clicked', () => {
    const props = makeProps();
    render(<ConnectionsEditor {...props} />);
    fireEvent.click(screen.getByText('network-connections.buttons.disconnect'));
    expect(props.onToggleState).toHaveBeenCalledWith(props.connections.connections[0]);
  });

  test('calls setConnectionId when name input changes', () => {
    const cn = makeConnection();
    render(<ConnectionsEditor {...makeProps({ connections: { connections: [cn] } })} />);
    fireEvent.change(screen.getByTestId('connection-name-input'), { target: { value: 'New Name' } });
    expect(cn.setConnectionId).toHaveBeenCalledWith('New Name');
  });

  test('calls onSave when save button clicked', async () => {
    const cn = makeConnection({ isDirty: true });
    const props = makeProps({ connections: { connections: [cn] } });
    render(<ConnectionsEditor {...props} />);
    fireEvent.click(screen.getByText('network-connections.buttons.save'));
    expect(props.onSave).toHaveBeenCalled();
  });

  test('connect button is disabled when allowSwitchState is false', () => {
    const cn = makeConnection({ allowSwitchState: false, state: 'new' });
    render(<ConnectionsEditor {...makeProps({ connections: { connections: [cn] } })} />);
    const btn = screen.getByText('network-connections.buttons.connect');
    expect(btn).toBeDisabled();
  });
});
