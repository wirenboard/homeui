// @vitest-environment happy-dom
import { render, screen } from '@/test/render';
import { DevicesCard } from './devices-card';

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

const devicesOf = (list: unknown[]) => ({
  configured: list.length, exposed: list.length, skipped: 0, config_error: null, list,
} as any);

describe('DevicesCard on a wide screen', () => {
  it('keeps the room column when at least one device has a room', () => {
    render(<DevicesCard devices={devicesOf([LAMP, PROBE])} onOpen={vi.fn()} />);

    expect(screen.getByText('matter.labels.column-room')).toBeInTheDocument();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
  });

  it('drops the room column when no device has one, rather than printing a column of blanks', () => {
    // The configurator leaves the room empty until somebody fills it in, which on a stand
    // is every device - and on a phone that column is a sixth of the width.
    render(<DevicesCard devices={devicesOf([PROBE])} onOpen={vi.fn()} />);

    expect(screen.queryByText('matter.labels.column-room')).not.toBeInTheDocument();
    expect(screen.getByText('matter.labels.column-state')).toBeInTheDocument();
  });

  it('says the config has no devices instead of drawing an empty table', () => {
    render(<DevicesCard devices={devicesOf([])} onOpen={vi.fn()} />);

    expect(screen.getByText('matter.labels.devices-empty')).toBeInTheDocument();
    expect(document.querySelector('table')).toBeNull();
  });
});
