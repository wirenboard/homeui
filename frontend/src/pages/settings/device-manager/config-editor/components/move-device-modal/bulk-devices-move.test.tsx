// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { BulkDevicesMove } from './bulk-devices-move';

// Table/TableCell import react-router-dom's Link for the optional row-link feature we don't use
// here; mocking it keeps this test focused on BulkDevicesMove's own selection/assignment logic.
vi.mock('@/components/table', () => ({
  Table: ({ children }: any) => <div>{children}</div>,
  TableRow: ({ children }: any) => <div>{children}</div>,
  TableCell: ({ children }: any) => <div>{children}</div>,
}));

// react-select's portal-based menu is unreliable to drive via fireEvent once the tree also has
// other interactive controls (the device checkboxes); a native select keeps the port picker itself
// deterministic, matching create-connection-modal.test.tsx's Dropdown mock.
vi.mock('@/components/dropdown', () => ({
  Dropdown: ({ value, options, onChange }: any) => (
    <select
      data-testid="target-port"
      value={value ?? ''}
      onChange={(e: any) => onChange(options.find((o: any) => o.value === e.target.value))}
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
}));

const makeDevice = (overrides: Partial<any> = {}) => ({
  mqttId: 'dev-1',
  name: 'Device',
  slaveId: '1',
  deviceType: 'wb-mr6c',
  deviceTypesStore: { getName: (type: string) => `type:${type}` },
  ...overrides,
}) as any;

const currentPort = { name: 'Port 1' } as any;

const targetPortOptions = [
  { label: 'Port 2', value: '/dev/ttyRS485-2' },
  { label: 'Port 3', value: '/dev/ttyRS485-3' },
];

describe('BulkDevicesMove', () => {
  test('renders the heading and a row per device with its address and type', () => {
    const deviceA = makeDevice({ mqttId: 'a', name: 'Device A', slaveId: '5', deviceType: 'wb-mr6c' });
    const deviceB = makeDevice({ mqttId: 'b', name: 'Device B', slaveId: '6', deviceType: 'wb-mir' });

    render(
      <BulkDevicesMove
        currentPort={currentPort}
        devices={[deviceA, deviceB]}
        targetPortOptions={targetPortOptions}
        isOpened
        onMove={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('device-manager.labels.move-devices')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Device A' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Device B' })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('type:wb-mr6c')).toBeInTheDocument();
    expect(screen.getByText('type:wb-mir')).toBeInTheDocument();
  });

  test('disables the confirm button until at least one device is checked', () => {
    const deviceA = makeDevice({ mqttId: 'a', name: 'Device A' });

    render(
      <BulkDevicesMove
        currentPort={currentPort}
        devices={[deviceA]}
        targetPortOptions={targetPortOptions}
        isOpened
        onMove={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'device-manager.buttons.move' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Device A' }));
    expect(screen.getByRole('button', { name: 'device-manager.buttons.move' })).not.toBeDisabled();
  });

  test('moves only the checked devices to the chosen port', () => {
    const deviceA = makeDevice({ mqttId: 'a', name: 'Device A' });
    const deviceB = makeDevice({ mqttId: 'b', name: 'Device B' });
    const onMove = vi.fn();

    render(
      <BulkDevicesMove
        currentPort={currentPort}
        devices={[deviceA, deviceB]}
        targetPortOptions={targetPortOptions}
        isOpened
        onMove={onMove}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Device A' }));
    fireEvent.click(screen.getByRole('button', { name: 'device-manager.buttons.move' }));

    expect(onMove).toHaveBeenCalledWith(new Map([[deviceA, '/dev/ttyRS485-2']]));
  });

  test('"select all" checks every device, and unchecking one drops it from the move', () => {
    const deviceA = makeDevice({ mqttId: 'a', name: 'Device A' });
    const deviceB = makeDevice({ mqttId: 'b', name: 'Device B' });
    const onMove = vi.fn();

    render(
      <BulkDevicesMove
        currentPort={currentPort}
        devices={[deviceA, deviceB]}
        targetPortOptions={targetPortOptions}
        isOpened
        onMove={onMove}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'device-manager.labels.select-all' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Device B' }));
    fireEvent.click(screen.getByRole('button', { name: 'device-manager.buttons.move' }));

    expect(onMove).toHaveBeenCalledWith(new Map([[deviceA, '/dev/ttyRS485-2']]));
  });

  test('moves the checked devices to the port picked from the dropdown', () => {
    const deviceA = makeDevice({ mqttId: 'a', name: 'Device A' });
    const onMove = vi.fn();

    render(
      <BulkDevicesMove
        currentPort={currentPort}
        devices={[deviceA]}
        targetPortOptions={targetPortOptions}
        isOpened
        onMove={onMove}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Device A' }));
    fireEvent.change(screen.getByTestId('target-port'), { target: { value: '/dev/ttyRS485-3' } });
    fireEvent.click(screen.getByRole('button', { name: 'device-manager.buttons.move' }));

    expect(onMove).toHaveBeenCalledWith(new Map([[deviceA, '/dev/ttyRS485-3']]));
  });

  test('disables the confirm button when there is no port to move to', () => {
    const deviceA = makeDevice({ mqttId: 'a', name: 'Device A' });

    render(
      <BulkDevicesMove
        currentPort={currentPort}
        devices={[deviceA]}
        targetPortOptions={[]}
        isOpened
        onMove={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Device A' }));

    expect(screen.getByRole('button', { name: 'device-manager.buttons.move' })).toBeDisabled();
  });
});
