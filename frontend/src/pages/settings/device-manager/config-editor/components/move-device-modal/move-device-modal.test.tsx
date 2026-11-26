// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { MoveDeviceModal } from './move-device-modal';

// Table/TableCell import react-router-dom's Link for the optional row-link feature we don't use
// here; mocking it keeps this test focused on which sub-component MoveDeviceModal picks.
vi.mock('@/components/table', () => ({
  Table: ({ children }: any) => <div>{children}</div>,
  TableRow: ({ children }: any) => <div>{children}</div>,
  TableCell: ({ children }: any) => <div>{children}</div>,
}));

const makeDevice = (overrides: Partial<any> = {}) => ({
  mqttId: 'dev-1',
  name: 'Device',
  slaveId: '1',
  deviceType: 'wb-mr6c',
  deviceTypesStore: { getName: (type: string) => `type:${type}` },
  ...overrides,
}) as any;

const currentPort = { name: 'Port 1', path: '/dev/ttyRS485-1' } as any;

const portOptions = [
  { label: 'Port 1', value: '/dev/ttyRS485-1' },
  { label: 'Port 2', value: '/dev/ttyRS485-2' },
];

describe('MoveDeviceModal', () => {
  test('renders the single-device UI for one device', () => {
    render(
      <MoveDeviceModal
        currentPort={currentPort}
        devices={[makeDevice()]}
        portOptions={portOptions}
        isOpened
        onMove={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('device-manager.labels.move-device')).toBeInTheDocument();
  });

  test('renders the bulk checklist UI for several devices', () => {
    render(
      <MoveDeviceModal
        currentPort={currentPort}
        devices={[makeDevice({ mqttId: 'a' }), makeDevice({ mqttId: 'b', name: 'Device B' })]}
        portOptions={portOptions}
        isOpened
        onMove={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('device-manager.labels.move-devices')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'device-manager.labels.select-all' })).toBeInTheDocument();
  });

  test('excludes the current port from the target port options', async () => {
    render(
      <MoveDeviceModal
        currentPort={currentPort}
        devices={[makeDevice()]}
        portOptions={portOptions}
        isOpened
        onMove={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.mouseDown(document.querySelector('.dropdown__control')!);

    expect(screen.queryByRole('option', { name: 'Port 1' })).not.toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Port 2' })).toBeInTheDocument();
  });
});
