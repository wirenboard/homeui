// @vitest-environment happy-dom
import type { MatterDevice, MatterFabric, MatterFabricDevice } from '@/stores/matter';
import { fireEvent, render, screen } from '@/test/render';
import { FabricDetails } from './fabric-details';

const NOW = 1_800_000_000_000;

const device = (did: number, name: string, over: Partial<MatterDevice> = {}): MatterDevice => ({
  did, name, type: 'switch', module: null, area: null, roles: ['on_off'], exposed: true,
  reason_code: null, reason: null, state: 'on', ...over,
});

const DEVICES = [
  device(10, 'Kitchen lamp'), device(11, 'Hall socket'), device(12, 'Off the bridge', { exposed: false }),
];

const hub = (over: Partial<MatterFabricDevice> = {}): MatterFabricDevice => ({
  name: 'hub.local',
  mac: '58:3b:d9:04:71:c2',
  address: 'fd00::7',
  online: true,
  subscriptions: 6,
  heard_at: NOW,
  ...over,
});

const MATTER_141 = {
  version: '1.4.1', specification_version: 0x01040100, data_model_revision: 18, interaction_model_revision: 12,
};

const fabric = (over: Partial<MatterFabric> = {}): MatterFabric => ({
  index: 2,
  adminFabricLabel: '',
  vendor_id: 0x1349,
  vendor_name: 'Apple Home',
  online: true,
  sessions: 1,
  subscriptions: 6,
  heard_at: NOW - 5000,
  paired_via: { by: 'page' },
  watching: { all: true, dids: [10, 11], missing: [] },
  devices: [],
  link: { code: 'online', says: 'on the line' },
  ...over,
});

const show = (over: Partial<MatterFabric> = {}, props: Partial<Parameters<typeof FabricDetails>[0]> = {}) => render(
  <FabricDetails
    fabric={fabric(over)}
    devices={DEVICES}
    now={NOW}
    isChecking={false}
    hasCheckFailed={false}
    onCheck={vi.fn()}
    {...props}
  />,
);

/** The value beside a label of a list of facts. */
const fact = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

const headings = () => screen.getAllByRole('heading').map((heading) => heading.textContent);

describe('FabricDetails', () => {
  it('goes from the general to the particular: device, Matter, pairing, subscriptions, link', () => {
    show({ devices: [hub({ matter: MATTER_141 })] });

    expect(headings()).toEqual([
      'matter.labels.fabric-device',
      'matter.labels.section-matter',
      'matter.labels.section-pairing',
      'matter.labels.section-subscriptions',
      'matter.labels.section-link',
    ]);
  });

  it('says of the device its name, its MAC and its address, each on a row of its own', () => {
    show({ devices: [hub()] });

    expect(fact('matter.labels.fact-device-name')).toBe('hub.local');
    expect(fact('matter.labels.fact-device-mac')).toBe('58:3b:d9:04:71:c2');
    expect(fact('matter.labels.fact-device-address')).toBe('fd00::7');
    expect(screen.queryByText('matter.labels.fact-device-state')).not.toBeInTheDocument();
  });

  it('leaves out what a device did not tell, and says that it gave no name', () => {
    show({ devices: [hub({ name: null, mac: null, address: null })] });

    expect(fact('matter.labels.fact-device-name')).toBe('matter.labels.device-nameless');
    expect(screen.queryByText('matter.labels.fact-device-mac')).not.toBeInTheDocument();
    expect(screen.queryByText('matter.labels.fact-device-address')).not.toBeInTheDocument();
  });

  it('says the state of each device when a fabric talks from several', () => {
    show({
      devices: [
        hub(),
        hub({ name: null, address: 'fd00::8', online: false, subscriptions: 0, heard_at: NOW - 3600000 }),
        hub({ name: null, address: 'fd00::9', online: false, subscriptions: 0, heard_at: undefined }),
      ],
    });

    expect(headings()[0]).toBe('matter.labels.fabric-devices');
    expect(screen.getAllByText('matter.labels.fact-device-state').map((label) => label.nextElementSibling?.textContent))
      .toEqual(['matter.labels.device-online', 'matter.labels.device-heard', 'matter.labels.device-offline']);
  });

  it('says the bridge has not seen a device yet instead of an empty section', () => {
    show({ devices: [] });
    expect(screen.getByText('matter.labels.fabric-devices-none')).toBeInTheDocument();
  });

  it('gives the Matter a device declared as three numbers, each on a row of its own', () => {
    show({ devices: [hub({ matter: MATTER_141 })] });

    expect(fact('matter.labels.fact-specification')).toBe('1.4.1');
    expect(fact('matter.labels.fact-data-model')).toBe('matter.labels.revision');
    expect(fact('matter.labels.fact-interaction-model')).toBe('matter.labels.revision');
    expect(screen.queryByText('matter.labels.fact-declared-by')).not.toBeInTheDocument();
  });

  it('says in one row that an old device declared no version, and has no section when nothing is known', () => {
    const { unmount } = show({
      devices: [hub({
        matter: {
          version: null, specification_version: 0, data_model_revision: null, interaction_model_revision: null,
        },
      })],
    });
    expect(fact('matter.labels.fact-specification')).toBe('matter.labels.specification-old');
    expect(screen.queryByText('matter.labels.fact-data-model')).not.toBeInTheDocument();
    unmount();

    show({ devices: [hub()] });
    expect(headings()).not.toContain('matter.labels.section-matter');
  });

  it('says which device declared which Matter only when the devices of a fabric differ', () => {
    const { unmount } = show({
      devices: [hub({ matter: MATTER_141 }), hub({ name: 'second.local', address: 'fd00::8', matter: MATTER_141 })],
    });
    expect(screen.getAllByText('matter.labels.fact-specification')).toHaveLength(1);
    unmount();

    show({
      devices: [
        hub({ matter: MATTER_141 }),
        hub({
          name: 'old.local',
          address: 'fd00::8',
          matter: {
            ...MATTER_141, version: '1.3.0', specification_version: 0x01030000, data_model_revision: 17,
          },
        }),
      ],
    });
    expect(screen.getAllByText('matter.labels.fact-declared-by').map((label) => label.nextElementSibling?.textContent))
      .toEqual(['hub.local', 'old.local']);
  });

  it('names the vendor with its number, and by the number alone when the bridge knows no name', () => {
    const { unmount } = show();
    expect(fact('matter.labels.fact-vendor')).toBe('Apple Home (0x1349)');
    unmount();

    show({ vendor_name: null });
    expect(fact('matter.labels.fact-vendor')).toBe('0x1349');
  });

  it.each([
    ['the button of the page', { by: 'page' }, 'matter.labels.via-page'],
    ['another fabric', { by: 'app', vendor_id: 0x1349, vendor_name: 'Apple Home' }, 'matter.labels.via-app'],
    ['a pairing older than the memory of the bridge', undefined, 'matter.labels.via-unknown'],
  ] as const)('says a fabric came in through %s', (_what, via, key) => {
    show({ paired_via: via });
    expect(fact('matter.labels.fact-paired-via')).toBe(key);
  });

  it('says from when until when the certificate holds, and nothing for a bridge that does not tell', () => {
    const { unmount } = show({ certificate: { valid_from: NOW - 1000, valid_until: NOW + 1000 } });
    expect(fact('matter.labels.fact-certificate')).toBe('matter.labels.certificate-until');
    unmount();

    const forever = show({ certificate: { valid_from: NOW - 1000, valid_until: null } });
    expect(fact('matter.labels.fact-certificate')).toBe('matter.labels.certificate-forever');
    forever.unmount();

    show();
    expect(screen.queryByText('matter.labels.fact-certificate')).not.toBeInTheDocument();
  });

  it.each([
    ['every device', { all: true, dids: [10, 11], missing: [] }, 6, 'matter.labels.watching-all'],
    ['some devices', { all: false, dids: [10], missing: [11] }, 3, 'matter.labels.watching-some'],
    ['nothing: no subscriptions', { all: false, dids: [], missing: [10, 11] }, 0, 'matter.labels.watching-none'],
  ] as const)('says a fabric follows %s, and how many subscriptions', (_what, watching, subscriptions, key) => {
    show({ watching: { ...watching, dids: [...watching.dids], missing: [...watching.missing] }, subscriptions });

    expect(fact('matter.labels.fact-watching')).toBe(key);
    expect(fact('matter.labels.fact-subscriptions')).toBe(String(subscriptions));
  });

  it('names the devices a fabric does not follow, with what to do about it in the same section', () => {
    show({
      subscriptions: 3,
      watching: { all: false, dids: [10], missing: [11] },
      link: { code: 'partly', says: '' },
    });

    expect(fact('matter.labels.fact-not-watching')).toBe('Hall socket');
    expect(screen.getByText('matter.labels.link-advice-partly').closest('section'))
      .toContainElement(screen.getByText('matter.labels.section-subscriptions'));
  });

  it('has no row of unfollowed devices and no advice for a fabric that follows them all', () => {
    show();

    expect(screen.queryByText('matter.labels.fact-not-watching')).not.toBeInTheDocument();
    expect(screen.queryByText(/link-advice/)).not.toBeInTheDocument();
  });

  it('names the first three of many unfollowed devices and counts the rest', () => {
    const many = [20, 21, 22, 23, 24].map((did) => device(did, `Relay ${did}`));
    render(
      <FabricDetails
        fabric={fabric({
          subscriptions: 3,
          watching: { all: false, dids: [10, 11], missing: [20, 21, 22, 23, 24] },
          link: { code: 'partly', says: '' },
        })}
        devices={[...DEVICES, ...many]}
        now={NOW}
        isChecking={false}
        hasCheckFailed={false}
        onCheck={vi.fn()}
      />,
    );

    expect(fact('matter.labels.fact-not-watching')).toBe('matter.labels.missing-more');
  });

  it('says there were no commands since the bridge started, and says the last one when there were', () => {
    const { unmount } = show();
    expect(fact('matter.labels.fact-commands')).toBe('matter.labels.commands-none');
    unmount();

    show({ commands: { count: 4, last_at: NOW - 60000, last_did: 11 } });
    expect(fact('matter.labels.fact-commands')).toBe('matter.labels.commands-some');
  });

  it('says the last activity is unknown for a fabric with no connection left', () => {
    show({ heard_at: undefined, online: false });
    expect(fact('matter.labels.fact-heard')).toBe('matter.labels.heard-unknown');
  });

  it('says what to do about a link that is not well in the section of the link', () => {
    show({ subscriptions: 0, link: { code: 'left', says: 'it gave the bridge up' } });

    expect(screen.getByText('matter.labels.link-advice-left').closest('section'))
      .toContainElement(screen.getByText('matter.labels.section-link'));
  });

  it('shows no check until one was made: only the button and what it does', () => {
    show();

    expect(screen.getByRole('button', { name: 'matter.buttons.check-link' })).toBeEnabled();
    expect(screen.getByText('matter.labels.check-hint')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.fact-checked')).not.toBeInTheDocument();
    expect(screen.queryByText('matter.labels.fact-in-network')).not.toBeInTheDocument();
  });

  it('asks for a check by its button, which is busy and says how long while the bridge is asking', () => {
    const onCheck = vi.fn();
    const { unmount } = show({}, { onCheck });
    fireEvent.click(screen.getByRole('button', { name: 'matter.buttons.check-link' }));
    expect(onCheck).toHaveBeenCalledTimes(1);
    unmount();

    show({}, { isChecking: true });
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('matter.labels.check-running')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.check-hint')).not.toBeInTheDocument();
  });

  it('gives a check as the three answers the bridge worked out, under the button', () => {
    show({
      subscriptions: 0,
      link: {
        code: 'forgot',
        says: '',
        checked_at: NOW - 30000,
        answers: { subscriptions: 0, report_dead: 'none', ping: 'answers' },
        summary: { in_network: 'yes', answers_bridge: 'no', holds_subscriptions: 'no' },
      },
    });

    expect(fact('matter.labels.fact-in-network')).toBe('matter.labels.reply-yes');
    expect(fact('matter.labels.fact-answers-bridge')).toBe('matter.labels.reply-no');
    expect(fact('matter.labels.fact-holds-subscriptions')).toBe('matter.labels.reply-no');
    expect(screen.getByText('matter.labels.fact-checked')).toBeInTheDocument();
  });

  it('says "unknown" for a question the bridge could not put, and that a subscription was dropped', () => {
    show({
      link: {
        code: 'stale',
        says: '',
        checked_at: NOW - 30000,
        summary: { answers_bridge: 'yes', holds_subscriptions: 'dropped' },
      },
    });

    expect(fact('matter.labels.fact-in-network')).toBe('matter.labels.reply-unknown');
    expect(fact('matter.labels.fact-holds-subscriptions')).toBe('matter.labels.reply-dropped');
  });

  it('says only when a check was made for a bridge that does not sum its answers up', () => {
    show({ link: { code: 'online', says: '', checked_at: NOW - 30000, answers: { subscriptions: 6 } } });

    expect(screen.getByText('matter.labels.fact-checked')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.fact-in-network')).not.toBeInTheDocument();
  });

  it('says so when a check did not go through', () => {
    show({}, { hasCheckFailed: true });
    expect(screen.getByText('matter.labels.check-failed')).toBeInTheDocument();
  });

  it('has nothing to copy: the details are read, not carried away', () => {
    show();
    expect(screen.queryByText('matter.buttons.copy')).not.toBeInTheDocument();
  });

  it('shows a fabric of a bridge older than this page with its pairing alone, and without breaking', () => {
    render(
      <FabricDetails
        fabric={{ index: 1, adminFabricLabel: '', vendor_id: 0x132F }}
        devices={[]}
        now={NOW}
        isChecking={false}
        hasCheckFailed={false}
        onCheck={vi.fn()}
      />,
    );

    expect(fact('matter.labels.fact-vendor')).toBe('0x132F');
    expect(headings()).toEqual(['matter.labels.section-pairing']);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
