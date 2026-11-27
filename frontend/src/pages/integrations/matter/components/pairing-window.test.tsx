// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@/test/render';
import { PairingWindow } from './pairing-window';

vi.mock('@/utils/clipboard', () => ({ copyToClipboard: vi.fn() }));

const OPEN = {
  closes_at: Date.now() + 15 * 60 * 1000,
  manual_code: '23331712339',
  payload: 'MT:Y.K9042C00KA0648G00',
  qr_version: 'abcdef12',
};

const windowOf = (props = {}) => (
  <PairingWindow
    pairing={null}
    isEmpty={false}
    devicesCount={7}
    left=""
    isChanging={false}
    hasFailed={false}
    hasExpired={false}
    isOffline={false}
    onOpen={vi.fn()}
    onClose={vi.fn()}
    {...props}
  />
);

const addButton = () => screen.getByRole('button', { name: 'matter.buttons.open-window' });

/** A coloured block of the kit. There must be none: the card it stands in is the only box. */
const colouredBlock = () => document.querySelector('.alertMessage');

describe('PairingWindow', () => {
  it('names what a fabric is right beside the button that adds one', () => {
    render(windowOf());

    expect(screen.getByText('matter.labels.new-fabric')).toBeInTheDocument();
    expect(screen.getByText('matter.labels.window-closed-paired')).toBeInTheDocument();
    expect(addButton()).toBeEnabled();
    // A quiet line under the list and not a coloured block: this is how the page looks
    // nearly all the time.
    expect(colouredBlock()).toBeNull();
  });

  it('says in words that the bridge is getting ready while a window is on its way', () => {
    // Right after the last fabric is removed that takes four seconds, and a button that
    // only spins read as a page that hung.
    render(windowOf({ isEmpty: true, isChanging: true, isOpening: true }));

    expect(screen.getByText('matter.labels.window-opening')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.window-closed')).not.toBeInTheDocument();
    expect(addButton()).toBeDisabled();
  });

  it('keeps its own words while another request is on its way: the code being changed is not a window', () => {
    render(windowOf({ isChanging: true }));

    expect(screen.queryByText('matter.labels.window-opening')).not.toBeInTheDocument();
    expect(screen.getByText('matter.labels.window-closed-paired')).toBeInTheDocument();
  });

  it('invites an empty bridge to its first app, and says how many devices it will get', () => {
    render(windowOf({ isEmpty: true }));

    expect(screen.getByText('matter.labels.fabrics-empty')).toBeInTheDocument();
    expect(screen.getByText('matter.labels.window-closed')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.window-no-devices')).not.toBeInTheDocument();
    expect(screen.queryByText('matter.labels.new-fabric')).not.toBeInTheDocument();
    expect(colouredBlock()).toBeNull();
    expect(addButton()).toBeEnabled();
  });

  it('warns an empty bridge that has no device to give, and still lets it be added', () => {
    render(windowOf({ isEmpty: true, devicesCount: 0 }));

    expect(screen.getByText('matter.labels.window-no-devices')).toBeInTheDocument();
    expect(addButton()).toBeEnabled();
  });

  it('asks for a fabric when the button is pressed', () => {
    const onOpen = vi.fn();
    render(windowOf({ onOpen }));

    fireEvent.click(addButton());
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('says the time ran out where the code was, instead of what a fabric is', () => {
    render(windowOf({ hasExpired: true }));

    expect(screen.getByText('matter.labels.window-expired')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.window-closed-paired')).not.toBeInTheDocument();
    expect(addButton()).toBeEnabled();
  });

  it('locks the button of a bridge that is off the network and says where the reason is', () => {
    const onOpen = vi.fn();
    render(windowOf({ isOffline: true, hasExpired: true, onOpen }));

    expect(screen.getByText('matter.labels.window-offline')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.window-expired')).not.toBeInTheDocument();
    expect(addButton()).toBeDisabled();
    fireEvent.click(addButton());
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('takes no second press while the bridge is still answering the first', () => {
    const onOpen = vi.fn();
    render(windowOf({ isChanging: true, onOpen }));

    expect(addButton()).toBeDisabled();
    fireEvent.click(addButton());
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('never offers to change the code: that lives in the settings', () => {
    const { rerender } = render(windowOf());
    expect(screen.queryByText('matter.buttons.new-code')).not.toBeInTheDocument();

    rerender(windowOf({ isEmpty: true }));
    expect(screen.queryByText('matter.buttons.new-code')).not.toBeInTheDocument();
  });

  it('shows the code, the picture, two steps and what is left while the bridge waits', () => {
    render(windowOf({ pairing: OPEN, left: '14:32' }));

    expect(screen.getByText('matter.labels.window-left')).toBeInTheDocument();
    expect(screen.getByText('2333-171-2339')).toBeInTheDocument();
    expect(screen.getByText('matter.labels.new-fabric')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    // The picture is asked for by the tag of the payload: the payload is a credential and
    // must not travel in a query string.
    expect(screen.getByAltText('matter.labels.qr-alt')).toHaveAttribute('src', '/matter/pairing.svg?v=abcdef12');
    expect(screen.queryByRole('button', { name: 'matter.buttons.open-window' })).not.toBeInTheDocument();
  });

  it('shows one code to type and never the payload the picture encodes', () => {
    render(windowOf({ pairing: OPEN, left: '14:32' }));

    expect(screen.getByText('matter.labels.manual-code')).toBeInTheDocument();
    expect(screen.queryByText('MT:Y.K9042C00KA0648G00')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/MT:/);
    // One thing to copy, so there is nothing to choose between.
    expect(screen.getAllByLabelText(/^matter\.buttons\.copy/)).toHaveLength(1);
  });

  it('calls the wait off with the button that stands where the adding one stood', () => {
    const onClose = vi.fn();
    render(windowOf({ pairing: OPEN, left: '14:32', onClose }));

    fireEvent.click(screen.getByText('matter.buttons.close-window'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('counts down on the card itself: no coloured block and no live region to read every second', () => {
    render(windowOf({ pairing: OPEN, left: '14:32' }));

    expect(colouredBlock()).toBeNull();
    expect(document.querySelector('[aria-live]')).toBeNull();
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it('says that the bridge refused, whichever face it has', () => {
    const { rerender } = render(windowOf({ hasFailed: true }));
    expect(screen.getByText('matter.labels.window-failed')).toBeInTheDocument();

    rerender(windowOf({ hasFailed: true, isEmpty: true }));
    expect(screen.getByText('matter.labels.window-failed')).toBeInTheDocument();

    rerender(windowOf({ hasFailed: true, pairing: OPEN, left: '14:32' }));
    expect(screen.getByText('matter.labels.window-failed')).toBeInTheDocument();

    rerender(windowOf({ pairing: OPEN, left: '14:32' }));
    expect(screen.queryByText('matter.labels.window-failed')).not.toBeInTheDocument();
  });
});
