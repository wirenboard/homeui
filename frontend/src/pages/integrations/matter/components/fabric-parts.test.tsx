// @vitest-environment happy-dom
import type { MatterFabric, MatterFabricOverview } from '@/stores/matter';
import { render, screen } from '@/test/render';
import { FabricLines, FabricName } from './fabric-parts';

const NOW = 1_800_000_000_000;

const WELL: MatterFabricOverview = {
  link: { status: 'ok', word: 'online' },
  devices: {
    status: 'ok', kind: 'all', followed: 9, of: 9,
  },
  commands: { status: 'ok', last_at: NOW - 300_000 },
};

const fabric = (over: Partial<MatterFabric> = {}): MatterFabric => ({
  index: 14,
  adminFabricLabel: 'Home',
  vendor_id: 0x132F,
  vendor_name: 'Yandex',
  label: { source: 'admin', text: 'Home' },
  overview: WELL,
  ...over,
});

const lines = (overview: Partial<MatterFabricOverview> = {}) => render(
  <FabricLines fabric={fabric({ overview: { ...WELL, ...overview } })} now={NOW} />,
);

/** How the line of a text is drawn: 'problem' with the triangle, 'quiet' in grey, 'plain' otherwise. */
const drawn = (text: string | RegExp) => {
  const line = screen.getByText(text).closest('.matter-line');
  if (line.querySelector('svg.matter-sign')) {
    return 'problem';
  }
  return line.classList.contains('matter-lineQuiet') ? 'quiet' : 'plain';
};

describe('FabricLines, the status of a fabric in three lines', () => {
  it('says the link by its words alone and names the two lines after it', () => {
    lines();

    expect(drawn('matter.labels.status-online')).toBe('plain');
    expect(screen.queryByText('matter.labels.line-link')).not.toBeInTheDocument();
    expect(drawn('matter.labels.follows-all')).toBe('plain');
    expect(screen.getByText('matter.labels.line-devices')).toBeInTheDocument();
    expect(screen.getByText('matter.labels.line-commands')).toBeInTheDocument();
  });

  it('keeps the place of a sign at a line that is well, so every line starts at one level', () => {
    const { container } = lines();

    expect(container.querySelectorAll('.matter-line')).toHaveLength(3);
    expect(container.querySelectorAll('.matter-line > .matter-sign')).toHaveLength(3);
    expect(container.querySelector('svg.matter-sign')).toBeNull();
  });

  it.each(['left', 'removed', 'forgot', 'offline'] as const)(
    'marks trouble with the link, "%s", and names the line it is about',
    (word) => {
      lines({ link: { status: 'error', word } });

      expect(drawn(new RegExp(`matter\\.labels\\.status-${word}`))).toBe('problem');
      expect(screen.getByText('matter.labels.line-link')).toHaveClass('matter-lineWhat');
    },
  );

  it.each(['quiet', 'away'] as const)('says a link that is "%s" in grey: silent is not trouble yet', (word) => {
    lines({ link: { status: 'off', word, since: NOW - 60_000 } });

    expect(drawn(`matter.labels.status-${word}`)).toBe('quiet');
  });

  it.each([
    ['some', 'error', 'problem'],
    ['none', 'error', 'problem'],
    ['nothing', 'off', 'quiet'],
    ['unknown', 'off', 'quiet'],
  ] as const)('says of the devices it follows "%s" as the bridge marked it: %s', (kind, status, how) => {
    lines({ devices: { status, kind } });

    expect(drawn(new RegExp(`matter\\.labels\\.follows-${kind}`))).toBe(how);
  });

  it('says when the last command came, and in grey that there was none', () => {
    const { unmount } = lines();
    // Counted from the clock of the controller, not of the browser.
    expect(drawn('5 minutes ago')).toBe('plain');
    unmount();

    lines({ commands: { status: 'off', last_at: null } });
    expect(drawn('matter.labels.commands-never')).toBe('quiet');
  });

  it('draws nothing for a fabric of a bridge older than this page', () => {
    const { container } = render(<FabricLines fabric={fabric({ overview: undefined })} now={NOW} />);

    expect(container.querySelector('.matter-line')).toBeNull();
  });
});

describe('FabricName, the name of a fabric and whose it is', () => {
  const under = (over: Partial<MatterFabric>) => {
    const { container, unmount } = render(<FabricName fabric={fabric(over)} />);
    const text = container.querySelector('.matter-rowLine').textContent;
    unmount();
    return text;
  };

  it('says the vendor under the name, by its name - and by its number only where there is no name', () => {
    expect(under({})).toBe('Yandex');
    const typedHere = { source: 'local', text: 'Hall', replaced: { source: 'admin', text: 'Home' } } as const;
    expect(under({ label: typedHere })).toBe('Yandex');
    expect(under({ vendor_name: null })).toBe('0x132F');
  });

  it('says the vendor also under a fabric that is named by its vendor, or by nothing at all', () => {
    // The owner of the project, 25.11.2026: the vendor has to stand there always. The name
    // above it may be a word of this page for that vendor.
    expect(under({ label: { source: 'vendor', text: 'Yandex' } })).toBe('Yandex');
    expect(under({ label: { source: 'none', text: null } })).toBe('Yandex');
    expect(under({ label: undefined })).toBe('Yandex');
  });
});
