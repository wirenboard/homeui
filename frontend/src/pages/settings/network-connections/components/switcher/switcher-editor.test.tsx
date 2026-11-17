// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@/test/render';
import { SwitcherEditor } from './switcher-editor';
import { TierLevel } from './types';

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, isDragging: false }),
}));
vi.mock('@dnd-kit/modifiers', () => ({
  restrictToFirstScrollableAncestor: {},
}));
vi.mock('react-responsive', () => ({
  useMediaQuery: () => false,
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, onClick, disabled, isLoading, ...rest }: any) => (
    <button disabled={disabled} data-loading={isLoading} aria-label={rest['aria-label']} onClick={onClick}>
      {rest.icon}{label}
    </button>
  ),
}));
vi.mock('@/components/card', () => ({
  Card: ({ heading, children }: any) => (
    <div data-testid="card">
      <h3>{heading}</h3>
      {children}
    </div>
  ),
}));
vi.mock('@/components/form', () => ({
  StringField: ({ title, value, onChange }: any) => (
    <div data-testid={`string-field-${title}`}>
      <label>{title}</label>
      <input value={value ?? ''} data-testid={`input-${title}`} onChange={(e: any) => onChange(e.target.value)} />
    </div>
  ),
  BooleanField: ({ title, value, onChange }: any) => (
    <div data-testid={`boolean-field-${title}`}>
      <label>{title}</label>
      <input
        type="checkbox"
        checked={value}
        data-testid={`checkbox-${title}`}
        onChange={(e: any) => onChange(e.target.checked)}
      />
    </div>
  ),
}));
vi.mock('@/utils/async-action', () => ({
  useAsyncAction: (fn: any) => [fn, false],
}));
vi.mock('@/assets/icons/arrow-down.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/arrow-up.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/arrow-left.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/arrow-right.svg', () => ({ default: () => null }));
vi.mock('../connection-item', () => ({
  ConnectionItem: ({ connection }: any) => <span data-testid="connection-item">{connection.name}</span>,
}));

function makeTier(id: TierLevel, name: string, connections: any[] = []) {
  return { id, name, connections };
}

function makeConnection(name: string) {
  return {
    name,
    data: { type: '01_nm_ethernet', connection_uuid: `uuid-${name}` },
    state: 'activated',
    description: '',
    operator: '',
    signalQuality: 0,
    accessTechnologies: '',
    withAutoconnect: true,
  };
}

function makeSwitcher(overrides: Record<string, any> = {}) {
  return {
    connectionPriorities: {
      tiers: [
        makeTier(TierLevel.High, 'high', [makeConnection('eth0')]),
        makeTier(TierLevel.Medium, 'medium', []),
        makeTier(TierLevel.Low, 'low', []),
      ],
      moveConnectionToTier: vi.fn(),
    },
    debug: { name: 'Debug', value: false, setValue: vi.fn() },
    connectivityUrl: { name: 'URL', description: 'desc', defaultText: '', value: '', error: '', setValue: vi.fn() },
    connectivityPayload: {
      name: 'Payload', description: 'desc', defaultText: '', value: '', error: '', setValue: vi.fn(),
    },
    stickyConnectionPeriod: {
      name: 'Sticky', description: 'desc', defaultText: '', value: '', error: '', setValue: vi.fn(),
    },
    isDirty: false,
    hasErrors: false,
    reset: vi.fn(),
    ...overrides,
  } as any;
}

describe('SwitcherEditor', () => {
  const defaultProps = {
    switcher: makeSwitcher(),
    onSave: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders switcher description', () => {
    render(<SwitcherEditor {...defaultProps} />);
    expect(screen.getByText('network-connections.labels.switcher-desc')).toBeInTheDocument();
  });

  test('renders three priority tier cards', () => {
    render(<SwitcherEditor {...defaultProps} />);
    const cards = screen.getAllByTestId('card');
    expect(cards).toHaveLength(3);
  });

  test('renders connections in their tiers', () => {
    render(<SwitcherEditor {...defaultProps} />);
    expect(screen.getByText('eth0')).toBeInTheDocument();
  });

  test('renders form fields', () => {
    render(<SwitcherEditor {...defaultProps} />);
    expect(screen.getByTestId('boolean-field-Debug')).toBeInTheDocument();
    expect(screen.getByTestId('string-field-URL')).toBeInTheDocument();
    expect(screen.getByTestId('string-field-Payload')).toBeInTheDocument();
    expect(screen.getByTestId('string-field-Sticky')).toBeInTheDocument();
  });

  test('save button is disabled when not dirty', () => {
    render(<SwitcherEditor {...defaultProps} />);
    const saveBtn = screen.getByText('network-connections.buttons.save');
    expect(saveBtn).toBeDisabled();
  });

  test('save button is enabled when dirty', () => {
    const switcher = makeSwitcher({ isDirty: true });
    render(<SwitcherEditor switcher={switcher} onSave={defaultProps.onSave} />);
    expect(screen.getByText('network-connections.buttons.save')).not.toBeDisabled();
  });

  test('save button is disabled when has errors', () => {
    const switcher = makeSwitcher({ isDirty: true, hasErrors: true });
    render(<SwitcherEditor switcher={switcher} onSave={defaultProps.onSave} />);
    expect(screen.getByText('network-connections.buttons.save')).toBeDisabled();
  });

  test('cancel button is disabled when not dirty', () => {
    render(<SwitcherEditor {...defaultProps} />);
    expect(screen.getByText('network-connections.buttons.cancel')).toBeDisabled();
  });

  test('cancel button calls reset when clicked', () => {
    const switcher = makeSwitcher({ isDirty: true });
    render(<SwitcherEditor switcher={switcher} onSave={defaultProps.onSave} />);
    fireEvent.click(screen.getByText('network-connections.buttons.cancel'));
    expect(switcher.reset).toHaveBeenCalled();
  });

  test('calls onSave when save button clicked', () => {
    const switcher = makeSwitcher({ isDirty: true });
    const onSave = vi.fn().mockResolvedValue(true);
    render(<SwitcherEditor switcher={switcher} onSave={onSave} />);
    fireEvent.click(screen.getByText('network-connections.buttons.save'));
    expect(onSave).toHaveBeenCalled();
  });

  test('renders priority arrow buttons for connections', () => {
    render(<SwitcherEditor {...defaultProps} />);
    const rightButtons = screen.getAllByLabelText('network-connections.buttons.priority-down');
    expect(rightButtons.length).toBeGreaterThan(0);
  });

  test('changing debug checkbox calls setValue', () => {
    const switcher = makeSwitcher();
    render(<SwitcherEditor switcher={switcher} onSave={defaultProps.onSave} />);
    fireEvent.click(screen.getByTestId('checkbox-Debug'));
    expect(switcher.debug.setValue).toHaveBeenCalled();
  });
});
