// @vitest-environment happy-dom
import type {
  MatterCommand, MatterFabric, MatterFabricDevice, MatterWatching,
} from '@/stores/matter';
import { fireEvent, render, screen, within } from '@/test/render';
import { FabricDetails } from './fabric-details';

const NOW = 1_800_000_000_000;

const MATTER_141 = {
  version: '1.4.1', specification_version: 0x01040100, data_model_revision: 18, interaction_model_revision: 12,
};

// As the bridge counts it: every one of the two devices it gives to Matter.
const ALL: MatterWatching = {
  all: true, kind: 'all', of: 2, dids: [10, 11], missing: [],
};

const hub = (over: Partial<MatterFabricDevice> = {}): MatterFabricDevice => ({
  name: 'hub.local',
  mac: '58:3b:d9:04:71:c2',
  address: 'fd00::7',
  online: true,
  subscriptions: 1,
  watching: ALL,
  heard_at: NOW - 5000,
  matter: MATTER_141,
  role: 'works',
  role_name: 'controller',
  ...over,
});

const phone = (over: Partial<MatterFabricDevice> = {}): MatterFabricDevice => ({
  name: null,
  mac: null,
  address: '192.168.1.21',
  online: false,
  subscriptions: 0,
  role: 'paired',
  role_name: 'commissioner',
  ...over,
});

const command = (over: Partial<MatterCommand> = {}): MatterCommand => ({
  at: NOW - 60000,
  did: 11,
  name: 'Hall socket',
  asked: [{ role: 'on_off', value: '1' }],
  action: 'on',
  from: { name: 'hub.local', address: 'fd00::7' },
  ...over,
});

const fabric = (over: Partial<MatterFabric> = {}): MatterFabric => ({
  index: 2,
  adminFabricLabel: '',
  vendor_id: 0x115F,
  vendor_name: 'Aqara',
  online: true,
  sessions: 1,
  subscriptions: 1,
  heard_at: NOW - 5000,
  paired_at: NOW - 3_600_000,
  paired_via: { by: 'page' },
  watching: ALL,
  devices: [hub(), phone()],
  link: { code: 'online', says: 'on the line' },
  ...over,
});

const show = (over: Partial<MatterFabric> = {}, props: Partial<Parameters<typeof FabricDetails>[0]> = {}) => render(
  <FabricDetails
    fabric={fabric(over)}
    now={NOW}
    isChecking={false}
    hasCheckFailed={false}
    onCheck={vi.fn()}
    {...props}
  />,
);

const sections = () => screen.getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent);
const sectionOf = (title: string) => screen.getByRole('heading', { level: 4, name: title }).closest('section');
const controllers = () => Array.from(document.querySelectorAll<HTMLElement>('.matter-detailsDevice'));
const labelsOf = (block: HTMLElement) => Array.from(block.querySelectorAll('dt')).map((label) => label.textContent);
// By the row and not by the next element: a name that carries a sign stands one element deeper.
const valueIn = (block: HTMLElement, label: string) => (
  within(block).getByText(label).closest('.matter-fact').querySelector('dd').textContent
);
/** Whether the row of a name carries the sign of a problem. */
const isMarked = (block: HTMLElement, label: string) => (
  within(block).getByText(label).closest('.matter-fact').querySelector('svg.matter-sign') !== null
);

const ROWS = [
  'matter.labels.fact-device-name',
  'matter.labels.fact-device-mac',
  'matter.labels.fact-device-address',
  'matter.labels.fact-subscriptions',
  'matter.labels.fact-watching',
  'matter.labels.fact-heard',
  'matter.labels.fact-matter',
  'matter.labels.fact-data-model',
  'matter.labels.fact-interaction-model',
];

describe('FabricDetails, the order of the sections', () => {
  it('says the short facts of the fabric first and its controllers last', () => {
    show();

    expect(sections()).toEqual([
      'matter.labels.section-pairing',
      'matter.labels.section-commands',
      'matter.labels.section-status',
      'matter.labels.controllers',
    ]);
  });

  it('shows a fabric of a bridge older than this page with its pairing alone', () => {
    render(
      <FabricDetails
        fabric={{ index: 1, adminFabricLabel: '', vendor_id: 0x132F }}
        now={NOW}
        isChecking={false}
        hasCheckFailed={false}
        onCheck={vi.fn()}
      />,
    );

    expect(sections()).toEqual(['matter.labels.section-pairing']);
    expect(screen.queryByRole('button', { name: 'matter.buttons.check-link' })).not.toBeInTheDocument();
  });
});

describe('FabricDetails, the controllers of a fabric', () => {
  it('shows the same rows in the same order for every controller, whatever it holds', () => {
    show();

    expect(controllers()).toHaveLength(2);
    expect(labelsOf(controllers()[0])).toEqual(ROWS);
    expect(labelsOf(controllers()[1])).toEqual(ROWS);
  });

  it('says in a word what a controller did not tell, instead of leaving the row out', () => {
    show();
    const [, quiet] = controllers();

    expect(valueIn(quiet, 'matter.labels.fact-device-name')).toBe('matter.labels.device-nameless');
    expect(valueIn(quiet, 'matter.labels.fact-device-mac')).toBe('matter.labels.unknown');
    expect(valueIn(quiet, 'matter.labels.fact-subscriptions')).toBe('matter.labels.none');
    expect(valueIn(quiet, 'matter.labels.fact-watching')).toBe('matter.labels.none');
    expect(valueIn(quiet, 'matter.labels.fact-heard')).toBe('matter.labels.unknown');
    expect(valueIn(quiet, 'matter.labels.fact-matter')).toBe('matter.labels.unknown');
    expect(valueIn(quiet, 'matter.labels.fact-data-model')).toBe('matter.labels.unknown');
  });

  it('gives the subscriptions and the three numbers of Matter of each controller in its own block', () => {
    show();
    const [working] = controllers();

    expect(valueIn(working, 'matter.labels.fact-subscriptions')).toBe('1');
    expect(valueIn(working, 'matter.labels.fact-watching')).toBe('matter.labels.watching-all');
    expect(valueIn(working, 'matter.labels.fact-matter')).toBe('1.4.1');
    expect(valueIn(working, 'matter.labels.fact-data-model')).toBe('matter.labels.revision');
    expect(valueIn(working, 'matter.labels.fact-interaction-model')).toBe('matter.labels.revision');
  });

  it('says a controller that declared no version is older than 1.3', () => {
    show({
      devices: [hub({
        matter: {
          version: null, specification_version: 0, data_model_revision: null, interaction_model_revision: null,
        },
      })],
    });

    expect(valueIn(controllers()[0], 'matter.labels.fact-matter')).toBe('matter.labels.specification-old');
  });

  it.each([
    ['works', 'controller', 'role-controller', 'role-says-works'],
    ['works_paired', 'controller_commissioner', 'role-controller-commissioner', 'role-says-works-paired'],
    ['paired', 'commissioner', 'role-commissioner', 'role-says-paired'],
    ['paired_alone', 'commissioner', 'role-commissioner', 'role-says-paired'],
    ['silent', 'controller', 'role-controller', 'role-says-silent'],
    ['idle', 'controller', 'role-controller', 'role-says-idle'],
  ] as const)(
    'titles the role "%s" by the name the bridge gives it and, after a dash, what it means here',
    (role, roleName, name, says) => {
      show({ devices: [hub({ role, role_name: roleName })] });

      const title = screen.getByRole('heading', { level: 5 });
      expect(within(title).getByText(`matter.labels.${name}`)).toHaveClass('matter-detailsRole');
      expect(title.textContent).toBe(`matter.labels.${name} - matter.labels.${says}`);
    },
  );

  it('says a pairing without its date when the bridge kept none', () => {
    show({
      paired_at: undefined,
      devices: [phone(), hub({ role: 'works_paired', role_name: 'controller_commissioner' })],
    });

    expect(screen.getAllByRole('heading', { level: 5 }).map((title) => title.textContent)).toEqual([
      'matter.labels.role-commissioner - matter.labels.role-says-paired-undated',
      'matter.labels.role-controller-commissioner - matter.labels.role-says-works-paired-undated',
    ]);
  });

  it('names a controller of a bridge that tells no roles by what it calls itself', () => {
    show({ devices: [hub({ role: undefined, role_name: undefined })] });
    expect(screen.getByRole('heading', { level: 5 }).textContent).toBe('hub.local');
  });

  it('names the devices a controller does not follow, under that controller', () => {
    show({
      devices: [hub({
        subscriptions: 3,
        watching: {
          all: false, kind: 'some', of: 2, dids: [10], missing: [11], missing_names: ['Hall socket'],
        },
      }), phone()],
    });
    const [partial, quiet] = controllers();

    expect(valueIn(partial, 'matter.labels.fact-watching')).toBe('matter.labels.watching-some');
    expect(valueIn(partial, 'matter.labels.fact-not-watching')).toBe('Hall socket');
    expect(within(quiet).queryByText('matter.labels.fact-not-watching')).not.toBeInTheDocument();
  });

  it('marks the problem of a controller at the facts that say it, and nothing else', () => {
    show({
      devices: [hub({
        subscriptions: 3,
        watching: {
          all: false, kind: 'some', of: 2, dids: [10], missing: [11], missing_names: ['Hall socket'],
        },
      }), phone()],
    });
    const [partial, quiet] = controllers();

    expect(isMarked(partial, 'matter.labels.fact-watching')).toBe(true);
    expect(isMarked(partial, 'matter.labels.fact-not-watching')).toBe(true);
    expect(isMarked(partial, 'matter.labels.fact-subscriptions')).toBe(false);
    // A controller with no problem has no sign and no place kept for one.
    expect(quiet.querySelector('.matter-sign')).toBeNull();
  });

  it('names the first three of many devices a controller does not follow and counts the rest', () => {
    const names = [20, 21, 22, 23, 24].map((did) => `Relay ${did}`);
    show({
      devices: [hub({
        watching: {
          all: false, kind: 'some', of: 7, dids: [10, 11], missing: [20, 21, 22, 23, 24], missing_names: names,
        },
      })],
    });

    expect(valueIn(controllers()[0], 'matter.labels.fact-not-watching')).toBe('matter.labels.missing-more');
  });

  it('says it does not know what a controller follows when the bridge did not count it', () => {
    show({ devices: [hub({ watching: { all: true, dids: [10, 11], missing: [] } })] });
    expect(valueIn(controllers()[0], 'matter.labels.fact-watching')).toBe('matter.labels.unknown');
  });

  it('says one controller under a heading in the singular, and none with a sentence', () => {
    const { unmount } = show({ devices: [hub()] });
    expect(sections()).toContain('matter.labels.controller');
    expect(screen.getByText('matter.labels.controllers-about')).toBeInTheDocument();
    unmount();

    show({ devices: [] });
    expect(screen.getByText('matter.labels.controllers-none')).toBeInTheDocument();
    expect(controllers()).toHaveLength(0);
  });
});

describe('FabricDetails, the commands of a fabric', () => {
  const commandsSection = () => within(sectionOf('matter.labels.section-commands'));

  it('says there were none since the bridge started', () => {
    show();
    expect(commandsSection().getByText('matter.labels.commands-none')).toBeInTheDocument();
  });

  it('lists the last commands: what was asked of which device, and which controller sent it', () => {
    show({
      commands: {
        count: 2,
        last_at: NOW - 60000,
        last_did: 11,
        recent: [command({ asked: [{ role: 'on_off', value: '0' }] }), command({ at: NOW - 64000 })],
      },
    });

    expect(commandsSection().getAllByText('matter.labels.command')).toHaveLength(2);
    expect(commandsSection().getAllByText('matter.labels.command-from')).toHaveLength(2);
    expect(commandsSection().getByText('matter.labels.commands-total')).toBeInTheDocument();
  });

  it('says a command came from a controller that gave no name, where the bridge knows neither name nor address', () => {
    show({
      commands: {
        count: 1, last_at: NOW - 60000, last_did: 11, recent: [command({ from: { name: null, address: null } })],
      },
    });

    // In its own words, not inside "sent by the controller ...": that read as a name.
    expect(commandsSection().getByText('matter.labels.device-nameless')).toBeInTheDocument();
    expect(commandsSection().queryByText('matter.labels.command-from')).not.toBeInTheDocument();
  });

  it('says how many there were in all when it shows fewer', () => {
    show({
      commands: {
        count: 9, last_at: NOW - 60000, last_did: 11, recent: [command()],
      },
    });
    expect(commandsSection().getByText('matter.labels.commands-total-more')).toBeInTheDocument();
  });

  it('keeps two commands of one second apart', () => {
    show({
      commands: {
        count: 2, last_at: NOW, last_did: 11, recent: [command({ at: NOW }), command({ at: NOW })],
      },
    });
    expect(commandsSection().getAllByText('matter.labels.command')).toHaveLength(2);
  });

  it('shows the last command of a bridge that keeps the count alone', () => {
    show({
      commands: {
        count: 4, last_at: NOW - 60000, last_did: 11, last_name: 'Hall socket',
      },
    });

    expect(commandsSection().getByText('Hall socket')).toBeInTheDocument();
    expect(commandsSection().queryByText('matter.labels.command-from')).not.toBeInTheDocument();
  });
});

describe('FabricDetails, the status of a fabric', () => {
  const statusSection = () => within(sectionOf('matter.labels.section-status'));

  it('shows no check until one was made: the last activity, the button and what it does', () => {
    show();

    expect(statusSection().getByText('matter.labels.fact-heard')).toBeInTheDocument();
    expect(statusSection().getByRole('button', { name: 'matter.buttons.check-link' })).toBeEnabled();
    expect(statusSection().getByText('matter.labels.check-hint')).toBeInTheDocument();
    expect(statusSection().queryByText('matter.labels.fact-checked')).not.toBeInTheDocument();
    expect(document.querySelector('.matter-detailsAdvice')).toBeNull();
  });

  it('asks for a check by its button, which is busy and says how long while the bridge is asking', () => {
    const onCheck = vi.fn();
    const { unmount } = show({}, { onCheck });
    fireEvent.click(screen.getByRole('button', { name: 'matter.buttons.check-link' }));
    expect(onCheck).toHaveBeenCalledTimes(1);
    unmount();

    show({}, { isChecking: true });
    expect(statusSection().getByRole('button')).toBeDisabled();
    expect(statusSection().getByText('matter.labels.check-running')).toBeInTheDocument();
  });

  it('gives a check as the three answers the bridge worked out, and what to do about a link that is not well', () => {
    show({
      subscriptions: 0,
      link: {
        code: 'forgot',
        says: '',
        checked_at: NOW - 30000,
        summary: { in_network: 'yes', answers_bridge: 'no', holds_subscriptions: 'no' },
      },
      // The words are the bridge's: about a line of the row with the sign, otherwise plain.
      advice: [
        { code: 'forgot', line: 'link', text: { ru: 'Совет о связи', en: 'Advice on the link' } },
        { code: 'quiet', text: { ru: 'Просто слова', en: 'Plain words' } },
      ],
    });

    expect(statusSection().getByText('Advice on the link').closest('.matter-line')
      .querySelector('svg.matter-sign')).not.toBeNull();
    expect(statusSection().getByText('Plain words').closest('.matter-line')).toBeNull();
    const status = sectionOf('matter.labels.section-status');
    expect(valueIn(status, 'matter.labels.fact-in-network')).toBe('matter.labels.reply-yes');
    expect(valueIn(status, 'matter.labels.fact-answers-bridge')).toBe('matter.labels.reply-no');
  });

  it('says so when a check did not go through', () => {
    show({}, { hasCheckFailed: true });
    expect(statusSection().getByText('matter.labels.check-failed')).toBeInTheDocument();
  });
});
