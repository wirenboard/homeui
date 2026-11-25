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
  it('keeps the group column when at least one device has a group', () => {
    render(<DevicesCard devices={devicesOf([LAMP, PROBE])} onOpen={vi.fn()} />);

    expect(screen.getByText('matter.labels.column-group')).toBeInTheDocument();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
  });

  it('drops the group column when no device has one, rather than printing a column of blanks', () => {
    // The configurator leaves the group empty until somebody fills it in, which on a stand
    // is every device - and on a phone that column is a sixth of the width.
    render(<DevicesCard devices={devicesOf([PROBE])} onOpen={vi.fn()} />);

    expect(screen.queryByText('matter.labels.column-group')).not.toBeInTheDocument();
    expect(screen.getByText('matter.labels.column-state')).toBeInTheDocument();
  });

  it('says the config has no devices instead of drawing an empty table', () => {
    render(<DevicesCard devices={devicesOf([])} onOpen={vi.fn()} />);

    expect(screen.getByText('matter.labels.devices-empty')).toBeInTheDocument();
    expect(document.querySelector('table')).toBeNull();
  });
});

describe('DevicesCard, what the state of a device says', () => {
  const show = (...list: unknown[]) => render(<DevicesCard devices={devicesOf(list)} onOpen={vi.fn()} />);
  const NOT_GIVEN = {
    ...PROBE, exposed: false, state: null, reason_code: 'type_unsupported', reason: 'type cannot be exposed yet',
  };

  it('shows the value of an exposed device and the reason of one that is not', () => {
    show(LAMP, NOT_GIVEN);

    expect(screen.getByText('matter.labels.state-on')).toBeInTheDocument();
    // The title is the translated code, not the English sentence of the service.
    expect(screen.getByText('matter.labels.not-exposed'))
      .toHaveAttribute('title', 'matter.labels.reason-type_unsupported');
  });

  it('falls back to the sentence of the service when there is no code', () => {
    // Nothing to translate: the words of the service are better than nothing.
    show({ ...NOT_GIVEN, reason_code: null, reason: 'something new happened' });

    expect(screen.getByText('matter.labels.not-exposed')).toHaveAttribute('title', 'something new happened');
  });

  it('marks an exposed device whose control said nothing yet', () => {
    show({ ...LAMP, state: null });
    expect(screen.getByText('matter.labels.state-silent')).toBeInTheDocument();
  });

  it('shows the reading of a sensor as it is, with no key around it', () => {
    // Only on and off have a translation; asking for one of "10.0 C" printed the key it
    // looked for right in the table - seen on the stand.
    show({ ...LAMP, state: '10.0 °C' });

    expect(screen.getByText('10.0 °C')).toBeInTheDocument();
    expect(screen.queryByText(/matter\.labels\.state-/)).not.toBeInTheDocument();
  });

  it('shows the readings of a lamp beside its state, and draws the one the bridge marked as a colour', () => {
    show({ ...LAMP, type: 'light', details: [{ text: '50 %' }, { text: '#FF0000', colour: '#FF0000' }] });

    // The tag is translated by a dictionary and a reading is not.
    expect(screen.getByText('matter.labels.state-on')).toBeInTheDocument();
    expect(screen.getByText('50 %').querySelector('.matter-swatch')).toBeNull();
    expect(screen.getByText('#FF0000').querySelector('.matter-swatch')).not.toBeNull();
  });

  it('names the roles the bridge does not carry, and nothing for a service too old to tell', () => {
    const { unmount } = show({ ...LAMP, type: 'light', roles: ['on_off', 'color'], ignored_roles: ['color'] });
    expect(screen.getByText('matter.labels.ignored-roles')).toBeInTheDocument();
    unmount();

    // The page and the service are different packages and arrive apart.
    show(LAMP);
    expect(screen.getByText('matter.labels.state-on')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.ignored-roles')).not.toBeInTheDocument();
  });
});
