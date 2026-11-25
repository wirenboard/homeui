// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@/test/render';
import { DevicesCard } from './devices-card';

const SOCKET = {
  did: 10,
  name: 'Kitchen socket',
  type: 'outlet',
  module: 'wb-mr6c_21',
  group: 'Kitchen',
  roles: ['on_off'],
  exposed: true,
  reason_code: null,
  reason: null,
  reason_status: null,
  channels: [{
    role: 'on_off', control: 'wb-mr6c_21/K1', status: 'ok', text: 'on',
  }],
  matter: { type: 'Outlet', power: 'wired', endpoint: 3 },
  followed_by: { answer: 'yes', of: 0, answers: [] },
};

const NOT_GIVEN = {
  did: 11,
  name: 'Blinds',
  type: 'cover',
  module: 'Blinds',
  group: null,
  roles: ['position'],
  exposed: false,
  reason_code: 'type_unsupported',
  reason: 'type cover cannot be exposed yet',
  reason_status: 'off',
  channels: [],
  matter: null,
  followed_by: null,
};

const YANDEX = { index: 1, vendor_id: 4911, label: { source: 'admin', text: 'Yandex' } };
const AQARA = { index: 2, vendor_id: 4447, label: { source: 'admin', text: 'Aqara' } };

const TOGGLE = { name: 'matter.buttons.device-details' };

const show = (list: unknown[], { fabrics = [] as unknown[], onOpen = vi.fn() } = {}) => render(
  <DevicesCard
    devices={{
      configured: list.length, exposed: list.length, skipped: 0, config_error: null, list,
    } as any}
    fabrics={fabrics as any}
    onOpen={onOpen}
  />,
);

/** How the line of a text is drawn: 'problem' with the triangle, 'quiet' in grey, 'plain' otherwise. */
const drawn = (text: string | RegExp) => {
  const line = screen.getByText(text).closest('.matter-line');
  if (line.querySelector('svg.matter-sign')) {
    return 'problem';
  }
  return line.classList.contains('matter-lineQuiet') ? 'quiet' : 'plain';
};

/** The words a status of the bridge is drawn by. */
const HOW = { ok: 'plain', error: 'problem', off: 'quiet' } as const;

describe('DevicesCard on a wide screen', () => {
  it('gives the device and its part a column each, the group under the device, the type under the part', () => {
    show([SOCKET, NOT_GIVEN]);

    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'matter.labels.column-name', 'matter.labels.column-part', 'matter.labels.column-passed',
      'matter.labels.column-actions',
    ]);
    const [device, part] = Array.from(screen.getByText('Kitchen socket').closest('tr').querySelectorAll('td'));
    // The device is its card of the configurator, and leads there; the part is what an app shows.
    expect(device.textContent).toBe('wb-mr6c_21Kitchen');
    expect(device.querySelector('button').textContent).toBe('wb-mr6c_21');
    expect(part.textContent).toBe('Kitchen socketconfigurator.types.outlet.name');
    expect(part.querySelector('button')).toBeNull();
  });

  it('names a device once, beside the first of its parts, and draws no line until the last', () => {
    const part = (did: number, name: string, first: boolean, last: boolean) => ({
      ...SOCKET, did, name, module: 'Board', card: {
        name: 'Board', group: 'Switchboard', parts: 3, first, last,
      },
    });
    const alone = {
      ...SOCKET, did: 20, name: 'Probe', module: 'Sensor', card: {
        name: 'Sensor', group: null, parts: 1, first: true, last: true,
      },
    };
    show([
      part(1, 'Socket A1', true, false), part(2, 'Socket A2', false, false), part(3, 'Socket A3', false, true), alone,
    ]);

    expect(screen.getAllByRole('button', { name: 'Board' })).toHaveLength(1);
    expect(screen.getAllByText('Switchboard')).toHaveLength(1);
    const rowOf = (name: string) => screen.getByText(name).closest('tr');
    expect(rowOf('Socket A1').querySelector('td').textContent).toBe('BoardSwitchboard');
    expect(rowOf('Socket A2').querySelector('td').textContent).toBe('');
    const names = ['Socket A1', 'Socket A2', 'Socket A3', 'Probe'];
    expect(names.map((name) => rowOf(name).classList.contains('matter-rowInCard')))
      .toEqual([true, true, false, false]);
  });

  it('leaves a part with no card without a device, and says its group under its own name', () => {
    show([{ ...SOCKET, module: null, card: null }]);

    const [device, part] = Array.from(screen.getByText('Kitchen socket').closest('tr').querySelectorAll('td'));
    expect(device.textContent).toBe('');
    expect(part.textContent).toBe('Kitchen socketconfigurator.types.outlet.name · Kitchen');
  });

  it('has a column for the apps only when there is an app: without one it is a column of blanks', () => {
    const { unmount } = show([SOCKET]);
    expect(screen.queryByText('matter.labels.column-apps')).not.toBeInTheDocument();
    unmount();

    show([SOCKET], { fabrics: [YANDEX] });
    expect(screen.getByText('matter.labels.column-apps')).toBeInTheDocument();
  });

  it('says the config has no devices instead of drawing an empty table', () => {
    show([]);

    expect(screen.getByText('matter.labels.devices-empty')).toBeInTheDocument();
    expect(document.querySelector('table')).toBeNull();
  });

  it('opens a row into the details of its device and of no other, and closes it again', () => {
    show([SOCKET, NOT_GIVEN]);
    const toggle = () => screen.getAllByRole('button', TOGGLE)[1];
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('matter.labels.section-not-passed')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.section-channels')).not.toBeInTheDocument();

    fireEvent.click(toggle());
    expect(screen.queryByText('matter.labels.section-not-passed')).not.toBeInTheDocument();
  });

  it('hands the device to the page when its card is clicked, and opens nothing by that', () => {
    const onOpen = vi.fn();
    show([SOCKET, NOT_GIVEN], { onOpen });

    fireEvent.click(screen.getByRole('button', { name: 'Blinds' }));

    expect(onOpen).toHaveBeenCalledWith(NOT_GIVEN);
    // The details are opened by the button of the row and by nothing else.
    expect(screen.queryByText('matter.labels.section-not-passed')).not.toBeInTheDocument();
  });

  it('hands the device to the page from its details too, by the button at their foot', () => {
    const onOpen = vi.fn();
    show([SOCKET, NOT_GIVEN], { onOpen });

    fireEvent.click(screen.getAllByRole('button', TOGGLE)[0]);
    fireEvent.click(screen.getByRole('button', { name: 'matter.buttons.open-configurator' }));

    expect(onOpen).toHaveBeenCalledWith(SOCKET);
  });
});

describe('DevicesCard, what a row says is passed', () => {
  const lamp = (...channels: unknown[]) => ({ ...SOCKET, type: 'light', channels });
  const ON = {
    role: 'on_off', control: 'lamp/K1', status: 'ok', text: 'on',
  };

  it('shows the first channel by its reading alone and names the ones after it', () => {
    show([lamp(ON, {
      role: 'brightness', control: 'lamp/level', status: 'ok', text: '50 %',
    })]);

    // The tag of a switch is a word of the page; a reading is the text of the bridge.
    expect(drawn('matter.labels.state-on')).toBe('plain');
    expect(screen.queryByText('configurator.roles.on_off')).not.toBeInTheDocument();
    expect(screen.getByText('configurator.roles.brightness')).toBeInTheDocument();
    expect(drawn('50 %')).toBe('plain');
  });

  it('shows the reading of a sensor as it is, and draws the one the bridge marked as a colour', () => {
    // Only on and off have a translation; asking for one of "10.0 C" printed the key it
    // looked for right in the table - seen on the stand.
    show([lamp({ ...ON, text: '10.0 °C' }, {
      role: 'color', control: 'lamp/rgb', status: 'ok', text: '#FF0000', colour: '#FF0000',
    })]);

    expect(screen.getByText('10.0 °C').querySelector('.matter-swatch')).toBeNull();
    expect(screen.getByText('#FF0000').querySelector('.matter-swatch')).not.toBeNull();
    expect(screen.queryByText(/matter\.labels\.state-/)).not.toBeInTheDocument();
  });

  it.each([
    ['error', 'silent'],
    ['error', 'unit_unknown'],
    ['off', 'role_unused'],
  ] as const)('names a channel that is not passed and says why, drawn as "%s" for %s', (status, code) => {
    // The first channel too: with no reading there is nothing else to tell it by.
    show([lamp({ role: 'color_temperature', control: 'lamp/cct', status, code })]);

    expect(screen.getByText('configurator.roles.color_temperature')).toBeInTheDocument();
    expect(drawn(new RegExp(`matter\\.labels\\.reason-${code}`))).toBe(HOW[status]);
  });

  it.each([
    ['off', 'quiet'],
    ['error', 'problem'],
    // No reason yet: the endpoint of the device is being built this second.
    [null, 'quiet'],
  ])('says a device that is not given in one line, drawn by its reason "%s"', (status, how) => {
    show([{ ...NOT_GIVEN, reason_status: status }]);

    expect(drawn('matter.labels.not-passed')).toBe(how);
    // The reason is the translated code, not the English sentence of the service.
    expect(screen.getByText(/matter\.labels\.reason-type_unsupported/)).toBeInTheDocument();
  });

  it('falls back to the sentence of the service when there is no code, and says nothing when there is neither', () => {
    const { unmount } = show([{ ...NOT_GIVEN, reason_code: null, reason: 'something new happened' }]);
    expect(screen.getByText(/something new happened/)).toBeInTheDocument();
    unmount();

    show([{ ...NOT_GIVEN, reason_code: null, reason: null }]);
    expect(screen.getByText('matter.labels.not-passed').textContent).toBe('matter.labels.not-passed');
  });

  it('draws a device of a service older than this page by its name alone', () => {
    // The page and the service are different packages and arrive apart.
    show([{ ...SOCKET, channels: undefined, matter: undefined, followed_by: undefined }], { fabrics: [YANDEX] });

    expect(screen.getByText('Kitchen socket')).toBeInTheDocument();
    expect(document.querySelector('.matter-line')).toBeNull();
  });
});

describe('DevicesCard, which apps a row says show the device', () => {
  const followed = (answer: string, ...answers: string[]) => ({
    ...SOCKET,
    followed_by: {
      answer, of: answers.length, answers: answers.map((one, place) => ({ index: place + 1, answer: one })),
    },
  });

  it.each([
    ['all of them in two words', followed('yes', 'yes', 'yes'), 'matter.labels.apps-all', 'plain'],
    ['the single app by its name', followed('yes', 'yes'), 'Yandex', 'plain'],
    ['the ones that did not take it', followed('no', 'yes', 'no'), 'matter.labels.apps-no', 'problem'],
    ['the ones that cannot be asked', followed('unknown', 'yes', 'unknown'), 'matter.labels.apps-unknown', 'quiet'],
  ])('names %s', (_what, device, text, how) => {
    show([device], { fabrics: [YANDEX, AQARA] });

    expect(drawn(text)).toBe(how);
  });

  it('says nothing of the apps for a device that is not given to any', () => {
    show([NOT_GIVEN], { fabrics: [YANDEX] });

    expect(screen.queryByText(/matter\.labels\.apps-/)).not.toBeInTheDocument();
  });
});
