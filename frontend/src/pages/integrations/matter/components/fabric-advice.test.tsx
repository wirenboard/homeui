// @vitest-environment happy-dom
import type { MatterAdvice, MatterFabric, MatterFabricOverview } from '@/stores/matter';
import { fireEvent, render, screen } from '@/test/render';
import { FabricAdvice } from './fabric-advice';
import { FabricLines } from './fabric-parts';

const NOW = 1_800_000_000_000;

const RECONNECT: MatterAdvice = {
  code: 'reconnect_for_new_devices',
  line: 'devices',
  text: { ru: 'Алиса берёт новые устройства только при подключении', en: 'Alice takes new devices only at pairing' },
  action: {
    kind: 'reconnect',
    label: { ru: 'Переподключить', en: 'Reconnect' },
    confirm: { ru: 'Мост удалит эту фабрику', en: 'The bridge will remove this fabric' },
  },
};

const open = () => fireEvent.click(screen.getByRole('button', { name: 'matter.buttons.advice' }));

// The shared Popup draws into <div class="floating"> of the app shell; without it the
// content is not in the document.
let floatingRoot: HTMLDivElement;

beforeEach(() => {
  floatingRoot = document.createElement('div');
  floatingRoot.className = 'floating';
  document.body.append(floatingRoot);
});

afterEach(() => {
  floatingRoot.remove();
});

describe('FabricAdvice, what the bridge advises about a line of a fabric', () => {
  it('keeps the words behind its button, and says them in the language of the page', () => {
    render(<FabricAdvice advice={[RECONNECT]} onAct={vi.fn()} />);
    expect(screen.queryByText(RECONNECT.text.en)).not.toBeInTheDocument();

    open();

    expect(screen.getByText(RECONNECT.text.en)).toBeInTheDocument();
    expect(screen.queryByText(RECONNECT.text.ru)).not.toBeInTheDocument();
  });

  it('offers the action under the name the bridge gave it, and hands the advice over when it is pressed', () => {
    const onAct = vi.fn();
    render(<FabricAdvice advice={[RECONNECT]} onAct={onAct} />);
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));

    expect(onAct).toHaveBeenCalledWith(RECONNECT);
    expect(screen.queryByText(RECONNECT.text.en)).not.toBeInTheDocument();
  });

  it('prints an advice as words when the page does not know its action, or has nobody to do it', () => {
    const unknown = { ...RECONNECT, action: { ...RECONNECT.action, kind: 'fly' } };
    const { unmount } = render(<FabricAdvice advice={[unknown]} onAct={vi.fn()} />);
    open();
    expect(screen.getByText(RECONNECT.text.en)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reconnect' })).not.toBeInTheDocument();
    unmount();

    render(<FabricAdvice advice={[RECONNECT]} />);
    open();
    expect(screen.queryByRole('button', { name: 'Reconnect' })).not.toBeInTheDocument();
  });
});

describe('FabricLines, where the way to an advice stands', () => {
  const OVERVIEW: MatterFabricOverview = {
    link: { status: 'ok', word: 'online' },
    devices: {
      status: 'error', kind: 'some', followed: 10, of: 24,
    },
    commands: { status: 'off', last_at: null },
  };
  const fabric = (advice?: MatterAdvice[]): MatterFabric => ({
    index: 2, adminFabricLabel: '', vendor_id: 0x132F, overview: OVERVIEW, advice,
  });
  // A line that is a problem says its words after a dash, so they are found by a part.
  const buttonIn = (text: RegExp) => screen.getByText(text).closest('li').querySelector('button');

  it('is at the end of the line the advice is about, and nowhere else', () => {
    render(<FabricLines fabric={fabric([RECONNECT])} now={NOW} onAdvice={vi.fn()} />);

    expect(buttonIn(/follows-some/)).not.toBeNull();
    expect(buttonIn(/status-online/)).toBeNull();
  });

  it('is not drawn for a fabric the bridge advises nothing about, and its lines stay what they were', () => {
    render(<FabricLines fabric={fabric()} now={NOW} onAdvice={vi.fn()} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/follows-some/).closest('.matter-line')
      .querySelector('svg.matter-sign')).not.toBeNull();
  });

  it('is not drawn at a line for an advice that stands only in the details', () => {
    render(<FabricLines fabric={fabric([{ ...RECONNECT, line: undefined }])} now={NOW} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
