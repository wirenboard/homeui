// @vitest-environment happy-dom
import { render, screen, within } from '@/test/render';
import { DeviceDetails } from './device-details';

const LAMP = {
  did: 12,
  name: 'Kitchen lamp',
  type: 'light',
  module: 'wb-led_150',
  group: 'Kitchen',
  roles: ['on_off', 'brightness', 'color_temperature'],
  exposed: true,
  reason_code: null,
  reason: null,
  reason_status: null,
  channels: [
    {
      role: 'on_off', control: 'wb-led_150/K1', status: 'ok', text: 'off',
    },
    {
      role: 'brightness', control: 'wb-led_150/Level', status: 'ok', text: '50 %',
    },
    {
      role: 'color_temperature', control: 'wb-led_150/CCT', status: 'error', code: 'unit_unknown',
    },
  ],
  matter: { type: 'Dimmable light', power: 'wired', endpoint: 7 },
  followed_by: { answer: 'no', of: 2, answers: [{ index: 1, answer: 'yes' }, { index: 2, answer: 'no' }] },
};

const YANDEX = { index: 1, vendor_id: 4911, label: { source: 'admin', text: 'Yandex' } };
const AQARA = { index: 2, vendor_id: 4447, label: { source: 'admin', text: 'Aqara' } };

const show = (over: Record<string, unknown> = {}, fabrics: unknown[] = [YANDEX, AQARA]) => render(
  <DeviceDetails device={{ ...LAMP, ...over } as any} fabrics={fabrics as any} onOpen={vi.fn()} />,
);

/** What stands beside a label in one section of the details. */
const factIn = (section: string, label: string) => {
  const block = screen.getByRole('heading', { level: 4, name: `matter.labels.section-${section}` }).closest('section');
  return within(block).getByText(label).closest('.matter-fact').querySelector('dd').textContent;
};
const sections = () => screen.getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent);

describe('DeviceDetails', () => {
  it('says of every app whether it shows the device, and advises when one does not', () => {
    const { unmount } = show();
    expect(factIn('apps', 'Yandex')).toBe('matter.labels.app-says-yes');
    expect(factIn('apps', 'Aqara')).toBe('matter.labels.app-says-no');
    // What happened, and under it the two reasons, the one a person can act on first.
    const advice = screen.getByText('matter.labels.app-no-advice').parentElement;
    expect(Array.from(advice.querySelectorAll('li')).map((line) => line.textContent))
      .toEqual(['matter.labels.app-no-added-later', 'matter.labels.app-no-type']);
    unmount();

    show({
      followed_by: {
        answer: 'unknown', of: 2, answers: [{ index: 1, answer: 'yes' }, { index: 2, answer: 'unknown' }],
      },
    });
    expect(factIn('apps', 'Aqara')).toBe('matter.labels.app-says-unknown');
    expect(screen.queryByText('matter.labels.app-no-advice')).not.toBeInTheDocument();
  });

  it('names an app the page was not told of by the number of its fabric', () => {
    show({}, [YANDEX]);

    expect(factIn('apps', '#2')).toBe('matter.labels.app-says-no');
  });

  it('lists every channel with its reading or its reason, and the control it is read from', () => {
    show();

    expect(factIn('channels', 'configurator.roles.on_off')).toBe('matter.labels.state-offwb-led_150/K1');
    expect(factIn('channels', 'configurator.roles.brightness')).toBe('50 %wb-led_150/Level');
    expect(factIn('channels', 'configurator.roles.color_temperature'))
      .toBe('matter.labels.reason-unit_unknownwb-led_150/CCT');
  });

  it('says what an app is given: the type in the words of Matter, the name, the group, the power, the endpoint', () => {
    show();

    expect(factIn('given', 'matter.labels.fact-matter-type')).toBe('Dimmable light');
    expect(factIn('given', 'matter.labels.fact-matter-name')).toBe('Kitchen lamp');
    expect(factIn('given', 'matter.labels.fact-matter-group')).toBe('matter.labels.group-as-room');
    expect(factIn('given', 'matter.labels.fact-power')).toBe('matter.labels.power-wired');
    expect(factIn('given', 'matter.labels.fact-endpoint')).toBe('7');
  });

  it('says a word for what is not there, rather than dropping the row', () => {
    show({ group: null, matter: { type: 'Light', power: null, endpoint: null } });

    expect(factIn('given', 'matter.labels.fact-matter-group')).toBe('matter.labels.none');
    // Not "unknown": the bridge says nothing of the power of a device it knows nothing about.
    expect(factIn('given', 'matter.labels.fact-power')).toBe('matter.labels.power-none');
    expect(factIn('given', 'matter.labels.fact-endpoint')).toBe('matter.labels.unknown');
  });

  it('has no section of the apps while no app is paired', () => {
    show({ followed_by: { answer: 'yes', of: 0, answers: [] } }, []);

    expect(sections()).toEqual(['matter.labels.section-channels', 'matter.labels.section-given']);
  });

  it('has one thing to say of a device that is not given to Matter: why', () => {
    show({
      exposed: false,
      reason_code: 'type_unsupported',
      reason_status: 'off',
      channels: [],
      matter: null,
      followed_by: null,
    });

    expect(sections()).toEqual(['matter.labels.section-not-passed']);
    expect(factIn('not-passed', 'matter.labels.fact-reason')).toBe('matter.labels.reason-type_unsupported');
  });
});
