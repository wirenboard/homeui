// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@/test/render';
import { DevicesCard } from './devices-card';

const SOCKET = {
  did: 10,
  name: 'Kitchen socket',
  type: 'outlet',
  module: 'wb-mr6c_21',
  area: 'Kitchen',
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
  area: null,
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

const show = (
  list: unknown[],
  { fabrics = [] as unknown[], outcomes = undefined as unknown, onOpen = vi.fn() } = {},
) => render(
  <DevicesCard
    devices={{
      configured: list.length, exposed: list.length, skipped: 0, config_error: null, outcomes, list,
    } as any}
    fabrics={fabrics as any}
    onOpen={onOpen}
  />,
);

/** The sign that stands on the line of a text: 'ok', 'error', 'off' or 'unknown'. */
const markOf = (text: string | RegExp) => screen.getByText(text).closest('.matter-line')
  .querySelector('.matter-mark').getAttribute('class').replace('matter-mark matter-mark-', '');

describe('DevicesCard on a wide screen', () => {
  it('puts the type and the group under the name, and spends no column on either', () => {
    show([SOCKET, NOT_GIVEN]);

    expect(screen.getByText('configurator.types.outlet.name · Kitchen')).toBeInTheDocument();
    expect(screen.getByText('configurator.types.cover.name')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'matter.labels.column-name', 'matter.labels.column-passed', 'matter.labels.column-actions',
    ]);
  });

  it('has a column for the apps only when there is an app: without one it is a column of blanks', () => {
    const { unmount } = show([SOCKET]);
    expect(screen.queryByText('matter.labels.column-apps')).not.toBeInTheDocument();
    unmount();

    show([SOCKET], { fabrics: [YANDEX] });
    expect(screen.getByText('matter.labels.column-apps')).toBeInTheDocument();
  });

  it('says the config has no devices instead of drawing an empty table', () => {
    show([], { outcomes: { ok: 0, error: 0, off: 0 } });

    expect(screen.getByText('matter.labels.devices-empty')).toBeInTheDocument();
    expect(document.querySelector('table')).toBeNull();
    expect(screen.queryByText('matter.labels.count-ok')).not.toBeInTheDocument();
  });

  it('shows the counts the bridge made, each with its sign, and none for a bridge that does not count', () => {
    const { unmount } = show([SOCKET, NOT_GIVEN], { outcomes: { ok: 1, error: 0, off: 1 } });
    expect(['ok', 'error', 'off'].map((outcome) => markOf(`matter.labels.count-${outcome}`)))
      .toEqual(['ok', 'error', 'off']);
    unmount();

    show([SOCKET, NOT_GIVEN]);
    expect(screen.queryByText('matter.labels.count-ok')).not.toBeInTheDocument();
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

  it('hands the device to the page when its name is clicked, and opens nothing by that', () => {
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
    expect(markOf('matter.labels.state-on')).toBe('ok');
    expect(screen.queryByText('configurator.roles.on_off')).not.toBeInTheDocument();
    expect(screen.getByText('configurator.roles.brightness')).toBeInTheDocument();
    expect(markOf('50 %')).toBe('ok');
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
  ])('names a channel that is not passed and says why, under the sign of "%s" for %s', (status, code) => {
    // The first channel too: with no reading there is nothing else to tell it by.
    show([lamp({ role: 'color_temperature', control: 'lamp/cct', status, code })]);

    expect(screen.getByText('configurator.roles.color_temperature')).toBeInTheDocument();
    expect(markOf(new RegExp(`matter\\.labels\\.reason-${code}`))).toBe(status);
  });

  it.each([
    ['off', 'off'],
    ['error', 'error'],
    // No reason yet: the endpoint of the device is being built this second.
    [null, 'off'],
  ])('says a device that is not given in one line, with the sign of its reason "%s"', (status, mark) => {
    show([{ ...NOT_GIVEN, reason_status: status }]);

    expect(markOf('matter.labels.not-passed')).toBe(mark);
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
    expect(document.querySelector('.matter-mark')).toBeNull();
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
    ['all of them in two words', followed('yes', 'yes', 'yes'), 'matter.labels.apps-all', 'ok'],
    ['the single app by its name', followed('yes', 'yes'), 'Yandex', 'ok'],
    ['the ones that did not take it', followed('no', 'yes', 'no'), 'matter.labels.apps-no', 'error'],
    ['the ones that cannot be asked', followed('unknown', 'yes', 'unknown'), 'matter.labels.apps-unknown', 'unknown'],
  ])('names %s', (_what, device, text, mark) => {
    show([device], { fabrics: [YANDEX, AQARA] });

    expect(markOf(text)).toBe(mark);
  });

  it('says nothing of the apps for a device that is not given to any', () => {
    show([NOT_GIVEN], { fabrics: [YANDEX] });

    expect(screen.queryByText(/matter\.labels\.apps-/)).not.toBeInTheDocument();
  });
});
