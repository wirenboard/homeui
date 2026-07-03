// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { Room } from './room';

const { aliceMock } = vi.hoisted(() => ({
  aliceMock: {
    rooms: new Map([
      ['room1', { name: 'Living Room', devices: ['d1', 'd2'] }],
      ['without_rooms', { name: 'Without rooms', devices: ['d3'] }],
    ]),
    devices: new Map([
      ['d1', {
        name: 'Lamp', room_id: 'room1',
        capabilities: [{ type: 'devices.capabilities.on_off', mqtt: '/wb/lamp' }],
        properties: [],
      }],
      ['d2', {
        name: 'Sensor', room_id: 'room1',
        capabilities: [],
        properties: [{ type: 'devices.properties.float', mqtt: '/wb/temp' }],
      }],
      ['d3', {
        name: 'Switch', room_id: 'without_rooms',
        capabilities: [{ type: 'devices.capabilities.toggle', mqtt: '/wb/sw' }],
        properties: [],
      }],
    ]),
    addRoom: vi.fn(async () => 'new-room-id'),
    updateRoom: vi.fn(async () => {}),
    deleteRoom: vi.fn(async () => {}),
    fetchData: vi.fn(async () => {}),
  },
}));

vi.mock('@/stores/alice', () => ({
  aliceStore: aliceMock,
  DefaultRoom: 'without_rooms',
}));
vi.mock('@/components/alert', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, onClick, disabled, 'aria-label': al, type }: any) => (
    <button disabled={disabled} aria-label={al} type={type} onClick={onClick}>
      {label}
    </button>
  ),
}));
vi.mock('@/components/input', () => ({
  Input: ({ value, onChange, placeholder }: any) => (
    <input
      value={value || ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
vi.mock('@/components/confirm', () => ({
  Confirm: ({ isOpened, heading, confirmCallback, closeCallback }: any) =>
    isOpened ? (
      <div data-testid="confirm-dialog">
        <h3>{heading}</h3>
        <button data-testid="confirm-yes" onClick={confirmCallback}>yes</button>
        <button data-testid="confirm-close" onClick={closeCallback}>close</button>
      </div>
    ) : null,
}));
vi.mock('@/components/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableRow: ({ children, onClick, 'aria-label': al }: any) => (
    <tr aria-label={al} onClick={onClick}>{children}</tr>
  ),
  TableCell: ({ children }: any) => <td>{children}</td>,
}));
vi.mock('@/assets/icons/edit-square.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/trash.svg', () => ({ default: () => null }));
vi.mock('@/utils/async-action', () => ({
  useAsyncAction: (fn: any) => [fn, false],
}));

const defaultProps = {
  id: 'room1' as string | undefined,
  onOpenDevice: vi.fn(),
  onSave: vi.fn(),
  onDelete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Room', () => {
  describe('room view', () => {
    test('renders room name as heading', () => {
      render(<Room {...defaultProps} />);
      expect(screen.getByRole('heading', { level: 4 }).textContent).toBe('Living Room');
    });

    test('renders device table with device names', () => {
      render(<Room {...defaultProps} />);
      expect(screen.getByText('Lamp')).toBeDefined();
      expect(screen.getByText('Sensor')).toBeDefined();
    });

    test('renders table column headers', () => {
      render(<Room {...defaultProps} />);
      expect(screen.getByText('alice.labels.device')).toBeDefined();
      expect(screen.getByText('alice.labels.room')).toBeDefined();
      expect(screen.getByText('alice.labels.topic')).toBeDefined();
    });

    test('shows device capabilities/properties types', () => {
      render(<Room {...defaultProps} />);
      expect(screen.getByText('on_off')).toBeDefined();
      expect(screen.getByText('float')).toBeDefined();
    });

    test('shows device mqtt topics', () => {
      render(<Room {...defaultProps} />);
      expect(screen.getByText('/wb/lamp')).toBeDefined();
      expect(screen.getByText('/wb/temp')).toBeDefined();
    });

    test('clicking device row calls onOpenDevice', () => {
      render(<Room {...defaultProps} />);
      fireEvent.click(screen.getByText('Lamp').closest('tr')!);
      expect(defaultProps.onOpenDevice).toHaveBeenCalledWith('d1');
    });
  });

  describe('all devices view', () => {
    test('shows all devices across rooms', () => {
      render(<Room {...defaultProps} id="all" />);
      expect(screen.getByText('Lamp')).toBeDefined();
      expect(screen.getByText('Sensor')).toBeDefined();
      expect(screen.getByText('Switch')).toBeDefined();
    });
  });

  describe('default room', () => {
    test('hides edit and delete for default room', () => {
      render(<Room {...defaultProps} id="without_rooms" />);
      expect(screen.queryByLabelText('alice.buttons.edit-room-name')).toBeNull();
      expect(screen.queryByLabelText('alice.buttons.delete-room')).toBeNull();
    });
  });

  describe('new room', () => {
    test('shows input field for new room', () => {
      render(<Room {...defaultProps} id={undefined} />);
      expect(
        screen.getByPlaceholderText('alice.labels.room-name'),
      ).toBeDefined();
    });

    test('shows empty device list', () => {
      render(<Room {...defaultProps} id={undefined} />);
      expect(screen.getByText('alice.labels.empty-list')).toBeDefined();
    });
  });

  describe('edit room name', () => {
    test('clicking edit shows input', () => {
      render(<Room {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('alice.buttons.edit-room-name'));
      expect(
        screen.getByPlaceholderText('alice.labels.room-name'),
      ).toBeDefined();
    });

    test('save button disabled when not editing', () => {
      render(<Room {...defaultProps} />);
      const saveBtn = screen.getByText('alice.buttons.save');
      expect(saveBtn.closest('button')?.disabled).toBe(true);
    });
  });

  describe('delete room', () => {
    test('clicking delete opens confirm dialog', () => {
      render(<Room {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('alice.buttons.delete-room'));
      expect(screen.getByTestId('confirm-dialog')).toBeDefined();
      expect(
        screen.getByText('alice.prompt.delete-room-title'),
      ).toBeDefined();
    });

    test('confirming delete calls deleteRoom', async () => {
      render(<Room {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('alice.buttons.delete-room'));
      fireEvent.click(screen.getByTestId('confirm-yes'));
      expect(aliceMock.deleteRoom).toHaveBeenCalledWith('room1');
    });

    test('delete for unsaved room calls onDelete directly', () => {
      render(<Room {...defaultProps} id={undefined} />);
      fireEvent.click(screen.getByLabelText('alice.buttons.delete-room'));
      expect(defaultProps.onDelete).toHaveBeenCalled();
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    });
  });

  describe('empty device list', () => {
    test('shows empty message when room has no devices', () => {
      aliceMock.rooms.set('empty', { name: 'Empty', devices: [] });
      render(<Room {...defaultProps} id="empty" />);
      expect(screen.getByText('alice.labels.empty-list')).toBeDefined();
    });
  });
});
