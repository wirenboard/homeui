// @vitest-environment happy-dom
import type Cell from '@/stores/devices/cell';
import { fireEvent, render, screen } from '@/test/render';
import { DeviceControlsDesktop } from './device-controls-desktop';
import { GearErrorStatus } from './gear-error-status';

const { devicesStoreMock } = vi.hoisted(() => ({
  devicesStoreMock: { getDeviceCells: vi.fn(() => [] as unknown[]) },
}));

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/devices', () => ({ devicesStore: devicesStoreMock }));
vi.mock('react-responsive', () => ({ useMediaQuery: () => false }));
vi.mock('@/components/cell', () => ({
  Cell: ({ cell, name }: any) => <div data-testid="cell">{name || cell.name}</div>,
}));

const cell = (
  controlId: string,
  name: string,
  type: string,
  { readOnly = false, order = 0, value = null as unknown, units = '' } = {},
): Cell =>
  ({ id: `dev/${controlId}`, controlId, name, type, readOnly, order, value, units } as unknown as Cell);

const texts = (testId: string) => screen.getAllByTestId(testId).map((node) => node.textContent);

describe('DeviceControlsDesktop', () => {
  const lamp = [
    cell('error_status', 'Ok', 'alarm', { readOnly: true, order: 0 }),
    cell('wanted_level', 'Wanted Level', 'range', { order: 1 }),
    cell('actual_level', 'Actual Level', 'value', { readOnly: true, order: 2, value: 42, units: '%' }),
    cell('step_up', 'Step Up', 'pushbutton', { order: 3 }),
  ];

  const openAllControls = () => fireEvent.click(screen.getByRole('button', { name: /all-controls/ }));

  beforeEach(() => {
    devicesStoreMock.getDeviceCells.mockReturnValue(lamp);
  });

  it('builds the pinned controls from the shared devices store', () => {
    render(<DeviceControlsDesktop mqttId="wb-dali_1_bus_1_1" />);
    expect(devicesStoreMock.getDeviceCells).toHaveBeenCalledWith('wb-dali_1_bus_1_1');
    expect(screen.getByRole('slider', { name: 'Wanted Level' })).toBeInTheDocument();
    expect(screen.queryAllByTestId('cell')).toHaveLength(0);
  });

  it('leaves the alarm to the toolbar, neither in the pinned controls nor in the list', () => {
    render(<DeviceControlsDesktop mqttId="wb-dali_1_bus_1_1" />);
    expect(screen.queryByText('Ok')).not.toBeInTheDocument();
    openAllControls();
    expect(texts('cell')).not.toContain('Ok');
  });

  it('shows the setpoint alone, the daemon keeps its reading on the same value', () => {
    render(<DeviceControlsDesktop mqttId="wb-dali_1_bus_1_1" />);
    openAllControls();
    // The reading is printed inside the slider, not as a separate cell.
    expect(texts('cell')).toContain('Step Up');
    expect(texts('cell')).not.toContain('Actual Level');
  });
});

describe('GearErrorStatus', () => {
  it('shows the gear error status', () => {
    devicesStoreMock.getDeviceCells.mockReturnValue([
      cell('error_status', 'Lamp failure', 'alarm', { readOnly: true, value: true }),
      cell('wanted_level', 'Wanted Level', 'range'),
    ]);
    render(<GearErrorStatus mqttId="wb-dali_1_bus_1_1" />);
    expect(texts('cell')).toEqual(['Lamp failure']);
  });

  it('renders nothing for a device without an error status', () => {
    devicesStoreMock.getDeviceCells.mockReturnValue([cell('wanted_level', 'Wanted Level', 'range')]);
    const { container } = render(<GearErrorStatus mqttId="wb-dali_1_bus_1_broadcast" />);
    expect(container).toBeEmptyDOMElement();
  });
});
