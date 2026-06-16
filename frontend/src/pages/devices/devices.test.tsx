// @vitest-environment happy-dom
import { render, screen, fireEvent, within } from '@testing-library/react';
import { authStoreMock } from '@/test/mocks/auth-store';
import DevicesPage from './devices';

const { deviceStoreMock } = vi.hoisted(() => {
  const mk = (id: string, name: string, type: string) => ({
    id, name, type, isVisible: true, toggleDeviceVisibility: vi.fn(),
  });
  const dev1 = mk('dev1', 'Temperature Sensor', 'virtual');
  const dev2 = mk('dev2', 'Light Switch', 'modbus');
  return {
    deviceStoreMock: {
      filteredDevices: new Map([['dev1', dev1], ['dev2', dev2]]),
      devices: new Map([['dev1', dev1], ['dev2', dev2]]),
      hasOpenedDivices: true,
      toggleDevices: vi.fn(),
      getDeviceCells: vi.fn((id: string) => [{ id: `${id}/c`, name: `Cell of ${id}` }]),
      deleteDevice: vi.fn(),
    },
  };
});

vi.mock('@/assets/icons/code.svg', () => ({ default: () => <span data-testid="icon-virtual" /> }));
vi.mock('@/assets/icons/system-device.svg', () => ({ default: () => <span data-testid="icon-system" /> }));
vi.mock('@/assets/icons/modbus.svg', () => ({ default: () => <span data-testid="icon-modbus" /> }));
vi.mock('@/assets/icons/zigbee.svg', () => ({ default: () => <span data-testid="icon-zigbee" /> }));
vi.mock('@/assets/icons/collapse.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/expand.svg', () => ({ default: () => null }));
vi.mock('@/assets/icons/trash.svg', () => ({ default: () => null }));
vi.mock('@/components/tooltip', () => ({ Tooltip: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/columns-wrapper', () => ({
  ColumnsWrapper: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/card', () => ({
  Card: ({ children, heading, actions, id }: any) => (
    <div data-testid={`card-${id}`}>
      <h3>{heading}</h3>
      {actions?.map((a: any) => (
        <button key={a.title} onClick={() => a.action(id)}>{a.title}</button>
      ))}
      {children}
    </div>
  ),
}));
vi.mock('@/components/cell', () => ({
  Cell: ({ cell }: any) => <div data-testid="cell">{cell.name}</div>,
}));
vi.mock('@/components/confirm', () => ({
  Confirm: ({ isOpened, heading, children, confirmCallback, closeCallback }: any) =>
    isOpened ? (
      <div data-testid="confirm-dialog">
        <h3>{heading}</h3>{children}
        <button data-testid="confirm-yes" onClick={confirmCallback}>yes</button>
        <button data-testid="confirm-close" onClick={closeCallback}>close</button>
      </div>
    ) : null,
}));
vi.mock('@/components/dropdown', () => import('@/test/mocks/dropdown'));
vi.mock('@/layouts/page', () => import('@/test/mocks/page-layout'));
vi.mock('@/stores/devices', () => ({
  devicesStore: deviceStoreMock,
  DeviceType: { System: 'system', Virtual: 'virtual', Modbus: 'modbus', Zigbee: 'zigbee' },
}));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));

function makeDevice(id: string, name: string, type: string) {
  return { id, name, type, isVisible: true, toggleDeviceVisibility: vi.fn() };
}

function resetDevices() {
  const dev1 = makeDevice('dev1', 'Temperature Sensor', 'virtual');
  const dev2 = makeDevice('dev2', 'Light Switch', 'modbus');
  deviceStoreMock.filteredDevices = new Map([['dev1', dev1], ['dev2', dev2]]);
  deviceStoreMock.devices = new Map([['dev1', dev1], ['dev2', dev2]]);
}

beforeEach(() => {
  vi.clearAllMocks();
  authStoreMock.hasRights.mockReturnValue(true);
  deviceStoreMock.hasOpenedDivices = true;
  deviceStoreMock.getDeviceCells.mockImplementation(
    (id: string) => [{ id: `${id}/c`, name: `Cell of ${id}` }],
  );
  resetDevices();
  localStorage.removeItem('foldedDevices');
});

describe('DevicesPage', () => {
  describe('rendering', () => {
    test('renders page title', () => {
      render(<DevicesPage />);
      expect(screen.getByText('devices.title')).toBeDefined();
    });

    test('renders device cards with names', () => {
      render(<DevicesPage />);
      expect(screen.getByText('Temperature Sensor')).toBeDefined();
      expect(screen.getByText('Light Switch')).toBeDefined();
    });

    test('renders cells for each device', () => {
      render(<DevicesPage />);
      expect(screen.getByText('Cell of dev1')).toBeDefined();
      expect(screen.getByText('Cell of dev2')).toBeDefined();
    });

    test('shows nothing alert when no devices', () => {
      deviceStoreMock.filteredDevices = new Map();
      render(<DevicesPage />);
      expect(screen.getByText('devices.labels.nothing')).toBeDefined();
    });

    test('initializes foldedDevices in localStorage', () => {
      render(<DevicesPage />);
      expect(localStorage.getItem('foldedDevices')).toBe('[]');
    });

    test('does not overwrite existing foldedDevices', () => {
      localStorage.setItem('foldedDevices', '["dev1"]');
      render(<DevicesPage />);
      expect(localStorage.getItem('foldedDevices')).toBe('["dev1"]');
    });
  });

  describe('expand/collapse toggle', () => {
    test('shows collapse label when devices are opened', () => {
      render(<DevicesPage />);
      expect(screen.getByLabelText('devices.labels.collapse')).toBeDefined();
    });

    test('shows expand label when devices are closed', () => {
      deviceStoreMock.hasOpenedDivices = false;
      render(<DevicesPage />);
      expect(screen.getByLabelText('devices.labels.expand')).toBeDefined();
    });

    test('clicking toggle calls toggleDevices', () => {
      render(<DevicesPage />);
      fireEvent.click(screen.getByLabelText('devices.labels.collapse'));
      expect(deviceStoreMock.toggleDevices).toHaveBeenCalled();
    });
  });

  describe('type filter', () => {
    test('shows type filter when multiple types present', () => {
      render(<DevicesPage />);
      expect(screen.getByText('devices.labels.all-devices')).toBeDefined();
    });

    test('hides type filter when single type present', () => {
      deviceStoreMock.filteredDevices = new Map([
        ['d1', makeDevice('d1', 'Dev', 'virtual')],
      ]);
      render(<DevicesPage />);
      expect(screen.queryByText('devices.labels.all-devices')).toBeNull();
    });

    test('filtering by type shows only matching devices', () => {
      render(<DevicesPage />);
      fireEvent.click(screen.getByText('devices.labels.type-virtual'));
      expect(screen.getByText('Temperature Sensor')).toBeDefined();
      expect(screen.queryByText('Light Switch')).toBeNull();
    });

    test('filtering by modbus shows only modbus devices', () => {
      render(<DevicesPage />);
      fireEvent.click(screen.getByText('devices.labels.type-modbus'));
      expect(screen.getByText('Light Switch')).toBeDefined();
      expect(screen.queryByText('Temperature Sensor')).toBeNull();
    });

    test('selecting all-devices resets filter', () => {
      render(<DevicesPage />);
      fireEvent.click(screen.getByText('devices.labels.type-virtual'));
      expect(screen.queryByText('Light Switch')).toBeNull();
      fireEvent.click(screen.getByText('devices.labels.all-devices'));
      expect(screen.getByText('Light Switch')).toBeDefined();
    });
  });

  describe('type icons', () => {
    test('renders correct icon for each device type', () => {
      const devs = new Map([
        ['v1', makeDevice('v1', 'Virtual Dev', 'virtual')],
        ['s1', makeDevice('s1', 'System Dev', 'system')],
        ['m1', makeDevice('m1', 'Modbus Dev', 'modbus')],
        ['z1', makeDevice('z1', 'Zigbee Dev', 'zigbee')],
      ]);
      deviceStoreMock.filteredDevices = devs;
      deviceStoreMock.devices = devs;
      render(<DevicesPage />);
      expect(within(screen.getByTestId('card-v1')).getByTestId('icon-virtual')).toBeDefined();
      expect(within(screen.getByTestId('card-s1')).getByTestId('icon-system')).toBeDefined();
      expect(within(screen.getByTestId('card-m1')).getByTestId('icon-modbus')).toBeDefined();
      expect(within(screen.getByTestId('card-z1')).getByTestId('icon-zigbee')).toBeDefined();
    });

    test('virtual device does not show modbus icon', () => {
      render(<DevicesPage />);
      const card = screen.getByTestId('card-dev1');
      expect(within(card).queryByTestId('icon-modbus')).toBeNull();
    });
  });

  describe('delete device', () => {
    test('clicking delete opens confirm dialog', () => {
      render(<DevicesPage />);
      const card = screen.getByTestId('card-dev1');
      fireEvent.click(within(card).getByText('devices.labels.delete'));
      expect(screen.getByTestId('confirm-dialog')).toBeDefined();
      expect(screen.getByText('devices.prompt.delete-title')).toBeDefined();
    });

    test('confirming delete calls deleteDevice and closes dialog', () => {
      render(<DevicesPage />);
      fireEvent.click(within(screen.getByTestId('card-dev1')).getByText('devices.labels.delete'));
      fireEvent.click(screen.getByTestId('confirm-yes'));
      expect(deviceStoreMock.deleteDevice).toHaveBeenCalledWith('dev1');
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    });

    test('cancelling delete closes dialog without deleting', () => {
      render(<DevicesPage />);
      fireEvent.click(within(screen.getByTestId('card-dev1')).getByText('devices.labels.delete'));
      fireEvent.click(screen.getByTestId('confirm-close'));
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
      expect(deviceStoreMock.deleteDevice).not.toHaveBeenCalled();
    });
  });
});
