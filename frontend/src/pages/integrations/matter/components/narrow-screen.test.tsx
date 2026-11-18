// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@/test/render';
import { DevicesCard } from './devices-card';
import { FabricsCard } from './fabrics-card';

vi.mock('react-responsive', () => ({ useMediaQuery: () => true }));

const LAMP = {
  did: 10,
  name: 'Kitchen light',
  type: 'switch',
  module: 'wb-mr6c_21',
  area: 'Kitchen',
  roles: ['on_off'],
  exposed: true,
  reason_code: null,
  reason: null,
  state: 'on',
};

const PROBE = {
  did: 11,
  name: 'Boiler',
  type: 'temperature_sensor',
  module: 'Boiler',
  area: null,
  roles: ['temperature'],
  exposed: true,
  reason_code: null,
  reason: null,
  state: '21.5 C',
};

const ONLINE_FABRIC = {
  index: 1, adminFabricLabel: 'Yandex', vendor_id: 4660, online: true,
};

const devicesOf = (list: unknown[]) => ({
  configured: list.length, exposed: list.length, skipped: 0, config_error: null, list,
} as any);

describe('the Matter page on a phone', () => {
  // The fabric menu is a shared Popup, which renders through a portal into
  // <div class="floating"> that the app shell provides.
  beforeEach(() => {
    const floatingRoot = document.createElement('div');
    floatingRoot.className = 'floating';
    document.body.append(floatingRoot);
  });

  it('lists devices as stacked lines, because four columns need 384 px of 317', () => {
    render(<DevicesCard devices={devicesOf([LAMP, PROBE])} onOpen={vi.fn()} />);

    expect(document.querySelector('table')).toBeNull();
    expect(screen.getByText('Kitchen light')).toBeInTheDocument();
    expect(screen.getByText('Boiler')).toBeInTheDocument();
  });

  it('puts the room beside the type, where the wide screen gives it a column', () => {
    render(<DevicesCard devices={devicesOf([LAMP, PROBE])} onOpen={vi.fn()} />);

    expect(screen.getByText('configurator.types.switch.name · Kitchen')).toBeInTheDocument();
    expect(screen.getByText('configurator.types.temperature_sensor.name')).toBeInTheDocument();
  });

  it('opens the card of the device the operator tapped', () => {
    const onOpen = vi.fn();
    render(<DevicesCard devices={devicesOf([LAMP, PROBE])} onOpen={onOpen} />);

    fireEvent.click(screen.getAllByLabelText('matter.labels.open-device')[1]);

    expect(onOpen).toHaveBeenCalledWith(PROBE);
  });

  it('lists fabrics as stacked lines, naming the date instead of giving it its own column', () => {
    render(<FabricsCard fabrics={[ONLINE_FABRIC] as any} onAction={vi.fn()} />);

    expect(document.querySelector('table')).toBeNull();
    expect(screen.getByText('Yandex')).toBeInTheDocument();
    expect(screen.getByText('matter.labels.link-online')).toBeInTheDocument();
    expect(
      screen.getByText('matter.labels.column-paired: matter.labels.paired-unknown'),
    ).toBeInTheDocument();
  });

  it('keeps the actions of a fabric reachable, which the clipped table did not', () => {
    render(<FabricsCard fabrics={[ONLINE_FABRIC] as any} onAction={vi.fn()} />);

    expect(screen.getByLabelText('matter.buttons.fabric-actions')).toBeInTheDocument();
  });

  it('says nothing is paired instead of drawing an empty list', () => {
    render(<FabricsCard fabrics={[]} onAction={vi.fn()} />);

    expect(screen.getByText('matter.labels.fabrics-empty')).toBeInTheDocument();
    expect(document.querySelector('.matter-rows')).toBeNull();
  });
});
