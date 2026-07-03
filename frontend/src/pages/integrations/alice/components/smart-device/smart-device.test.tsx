// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartDevice } from './smart-device';

const { aliceMock } = vi.hoisted(() => ({
  aliceMock: {
    rooms: new Map([
      ['without_rooms', { name: 'Without rooms' }],
      ['room1', { name: 'Living Room' }],
    ]),
    devices: new Map([
      ['d1', {
        name: 'Test Lamp',
        room_id: 'room1',
        type: 'devices.types.light',
        capabilities: [{ type: 'devices.capabilities.on_off', mqtt: '', parameters: {} }],
        properties: [],
      }],
    ]),
    addDevice: vi.fn(async () => 'new-dev-id'),
    updateDevice: vi.fn(async () => ({})),
    deleteDevice: vi.fn(async () => {}),
    copyDevice: vi.fn(async () => 'copy-id'),
    fetchData: vi.fn(async () => {}),
  },
}));

vi.mock('@/stores/alice', () => ({
  aliceStore: aliceMock,
  DefaultRoom: 'without_rooms',
  deviceTypes: {
    sensor: ['devices.types.sensor'],
    electrics: ['devices.types.light', 'devices.types.socket'],
  },
}));
vi.mock('@/components/alert', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
}));
vi.mock('@/components/button', () => ({
  Button: ({ label, onClick, disabled, 'aria-label': al }: any) => (
    <button disabled={disabled} aria-label={al} onClick={onClick}>{label}</button>
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
vi.mock('@/components/dropdown', () => ({
  Dropdown: ({ options, onChange, value }: any) => (
    <div data-testid="dropdown">
      <span data-testid="dropdown-value">{value}</span>
      {options?.map((o: any) => (
        <button key={o.value} onClick={() => onChange(o)}>{o.label}</button>
      ))}
    </div>
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
vi.mock('./components/device-skills', () => ({
  DeviceSkills: () => <div data-testid="device-skills" />,
}));
vi.mock('@/assets/icons/copy.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/edit-square.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/trash.svg', () => ({ default: () => null }));
vi.mock('@/utils/async-action', () => ({
  useAsyncAction: (fn: any) => [fn, false],
}));

const defaultProps = {
  id: 'd1' as string | undefined,
  onSave: vi.fn(),
  onDelete: vi.fn(),
  onOpenDevice: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SmartDevice', () => {
  describe('existing device', () => {
    test('renders device name as heading', () => {
      render(<SmartDevice {...defaultProps} />);
      expect(screen.getByText('Test Lamp')).toBeDefined();
    });

    test('renders room dropdown', () => {
      render(<SmartDevice {...defaultProps} />);
      expect(screen.getByText('alice.labels.room')).toBeDefined();
    });

    test('renders category and type dropdowns', () => {
      render(<SmartDevice {...defaultProps} />);
      expect(screen.getByText('alice.labels.device-category')).toBeDefined();
      expect(screen.getByText('alice.labels.device-type')).toBeDefined();
    });

    test('renders device skills component', () => {
      render(<SmartDevice {...defaultProps} />);
      expect(screen.getByTestId('device-skills')).toBeDefined();
    });

    test('renders edit, copy, delete, save buttons', () => {
      render(<SmartDevice {...defaultProps} />);
      expect(screen.getByLabelText('alice.buttons.edit-device-name')).toBeDefined();
      expect(screen.getByLabelText('alice.buttons.copy-device')).toBeDefined();
      expect(screen.getByLabelText('alice.buttons.delete-device')).toBeDefined();
      expect(screen.getByText('alice.buttons.save')).toBeDefined();
    });

    test('clicking edit shows name input', () => {
      render(<SmartDevice {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('alice.buttons.edit-device-name'));
      expect(screen.getByPlaceholderText('alice.labels.device-name')).toBeDefined();
    });

    test('clicking copy calls copyDevice', () => {
      render(<SmartDevice {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('alice.buttons.copy-device'));
      expect(aliceMock.copyDevice).toHaveBeenCalled();
    });
  });

  describe('new device', () => {
    test('shows name input for new device', () => {
      render(<SmartDevice {...defaultProps} id={undefined} />);
      expect(screen.getByPlaceholderText('alice.labels.device-name')).toBeDefined();
    });

    test('save button disabled when name is empty', () => {
      render(<SmartDevice {...defaultProps} id={undefined} />);
      const btn = screen.getByText('alice.buttons.save').closest('button');
      expect(btn?.disabled).toBe(true);
    });

    test('hides copy button for new device', () => {
      render(<SmartDevice {...defaultProps} id={undefined} />);
      expect(screen.queryByLabelText('alice.buttons.copy-device')).toBeNull();
    });

    test('delete for unsaved device calls onDelete directly', () => {
      render(<SmartDevice {...defaultProps} id={undefined} />);
      fireEvent.click(screen.getByLabelText('alice.buttons.delete-device'));
      expect(defaultProps.onDelete).toHaveBeenCalled();
    });
  });

  describe('delete device', () => {
    test('clicking delete opens confirm dialog', () => {
      render(<SmartDevice {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('alice.buttons.delete-device'));
      expect(screen.getByTestId('confirm-dialog')).toBeDefined();
      expect(screen.getByText('alice.prompt.delete-device-title')).toBeDefined();
    });

    test('confirming delete calls deleteDevice', () => {
      render(<SmartDevice {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('alice.buttons.delete-device'));
      fireEvent.click(screen.getByTestId('confirm-yes'));
      expect(aliceMock.deleteDevice).toHaveBeenCalledWith('d1');
    });

    test('cancelling delete closes dialog', () => {
      render(<SmartDevice {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('alice.buttons.delete-device'));
      fireEvent.click(screen.getByTestId('confirm-close'));
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    });
  });
});
