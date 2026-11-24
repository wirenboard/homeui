// @vitest-environment happy-dom
import { act, fireEvent, render, screen } from '@/test/render';
import { copyToClipboard } from '@/utils/clipboard';
import { CopyField } from './copy-field';
import { PairingWindow } from './pairing-window';

vi.mock('@/utils/clipboard', () => ({ copyToClipboard: vi.fn() }));

const OPEN = {
  closes_at: Date.now() + 15 * 60 * 1000,
  manual_code: '23331712339',
  payload: 'MT:Y.K9042C00KA0648G00',
  qr_version: 'abcdef12',
};

const waiting = (props = {}) => (
  <PairingWindow
    pairing={OPEN}
    isEmpty={false}
    devicesCount={7}
    left="14:55"
    isChanging={false}
    hasFailed={false}
    hasExpired={false}
    isOffline={false}
    onOpen={vi.fn()}
    onClose={vi.fn()}
    {...props}
  />
);

const field = () => <CopyField label="matter.labels.manual-code" text="2333-171-2339" value="23331712339" />;

const copyButton = () => screen.getByLabelText('matter.buttons.copy: matter.labels.manual-code');

describe('the block shown while the bridge waits to be added', () => {
  beforeEach(() => {
    vi.mocked(copyToClipboard).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the status, the time left and the cancel side by side, in one group', () => {
    render(waiting());

    const group = screen.getByText('matter.labels.window-waiting').parentElement;
    expect(group).toHaveClass('matter-waitingTrio');
    expect(screen.getByText('matter.labels.window-left').parentElement).toBe(group);
    expect(screen.getByRole('button', { name: 'matter.buttons.close-window' }).parentElement).toBe(group);
  });

  it('puts that group in the row of the title, where the button that adds a fabric stands', () => {
    const { rerender } = render(waiting({ pairing: null }));
    const row = screen.getByRole('button', { name: 'matter.buttons.open-window' }).parentElement;
    expect(row).toHaveClass('matter-newFabric');

    rerender(waiting());
    const group = screen.getByText('matter.labels.window-waiting').parentElement;
    expect(group.parentElement).toHaveClass('matter-newFabric');
    expect(screen.getByText('matter.labels.new-fabric').parentElement).toBe(group.parentElement);
  });

  it('sets the title of the section as a label in every state, the invitation of an empty bridge too', () => {
    const { rerender } = render(waiting({ pairing: null }));
    const row = () => screen.getByRole('button', { name: 'matter.buttons.open-window' }).parentElement;
    expect(screen.getByText('matter.labels.new-fabric')).toHaveClass('matter-newFabricTitle');
    expect(row().className).toBe('matter-newFabric');

    rerender(waiting({ pairing: null, isEmpty: true }));
    expect(screen.getByText('matter.labels.fabrics-empty')).toHaveClass('matter-newFabricTitle');
    expect(screen.getByText('matter.labels.window-closed')).toHaveClass('matter-newFabricNote');
    expect(row().className).toBe('matter-newFabric');

    rerender(waiting({ isEmpty: true }));
    expect(screen.getByText('matter.labels.new-fabric')).toHaveClass('matter-newFabricTitle');
  });

  it('cancels with a plain button, not a red one: nothing is lost by stopping the wait', () => {
    const onClose = vi.fn();
    render(waiting({ onClose }));

    const cancel = screen.getByRole('button', { name: 'matter.buttons.close-window' });
    expect(cancel).toHaveClass('button-secondary');
    expect(cancel).not.toHaveClass('button-danger');
    fireEvent.click(cancel);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('copies the code when the code itself is clicked, without the dashes it is shown with', () => {
    render(field());

    fireEvent.click(screen.getByText('2333-171-2339'));
    expect(copyToClipboard).toHaveBeenCalledWith('23331712339');
  });

  it('copies with the button too, which has an icon and a word', () => {
    render(field());

    expect(copyButton()).toHaveTextContent('matter.buttons.copy');
    fireEvent.click(copyButton());
    expect(copyToClipboard).toHaveBeenCalledWith('23331712339');
  });

  it('says the copy was made on the button and to a screen reader, then offers to copy again', () => {
    vi.useFakeTimers();
    render(field());
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    fireEvent.click(screen.getByText('2333-171-2339'));
    expect(copyButton()).toHaveTextContent('matter.buttons.copied');
    expect(screen.getByRole('status')).toHaveTextContent('matter.labels.copied');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(copyButton()).toHaveTextContent('matter.buttons.copy');
    expect(copyButton()).not.toHaveTextContent('matter.buttons.copied');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('labels the code and adds no instruction to click it: the button beside it says enough', () => {
    render(field());

    expect(screen.getByText('matter.labels.manual-code')).toBeInTheDocument();
    expect(document.querySelector('.matter-fieldLabel')).toHaveTextContent(/^matter\.labels\.manual-code$/);
  });
});
