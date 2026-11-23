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
    left=""
    isChanging={false}
    hasFailed={false}
    onOpen={vi.fn()}
    onClose={vi.fn()}
    onNewCode={vi.fn()}
    {...props}
  />
);

/** The alert the block is drawn with: its colour is how the three faces differ. */
const theAlert = () => document.querySelector('.alertMessage');

describe('PairingWindow', () => {
  it('invites to pair while nothing is paired, and stands out doing it', () => {
    render(windowOf({ isEmpty: true }));

    expect(screen.getByText('matter.labels.window-closed')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.window-closed-paired')).not.toBeInTheDocument();
    expect(theAlert()).toHaveClass('alertMessage-info');
    expect(screen.getByText('matter.buttons.open-window')).toBeInTheDocument();
  });

  it('only remarks that the window is closed once something is paired', () => {
    render(windowOf());

    expect(screen.getByText('matter.labels.window-closed-paired')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.window-closed')).not.toBeInTheDocument();
    expect(theAlert()).toHaveClass('alertMessage-gray');
    expect(screen.getByText('matter.buttons.open-window')).toBeInTheDocument();
  });

  it('shows no code and no picture while the window is closed', () => {
    render(windowOf());

    expect(screen.queryByAltText('matter.labels.qr-alt')).not.toBeInTheDocument();
    expect(screen.queryByText('matter.labels.manual-code')).not.toBeInTheDocument();
    expect(screen.queryByText('matter.buttons.close-window')).not.toBeInTheDocument();
  });

  it('asks for a window and for a new code with its two buttons, one for each', () => {
    const onOpen = vi.fn();
    const onNewCode = vi.fn();
    render(windowOf({ onOpen, onNewCode }));

    fireEvent.click(screen.getByText('matter.buttons.open-window'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onNewCode).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('matter.buttons.new-code'));
    expect(onNewCode).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('takes no second press while the bridge is still answering the first', () => {
    const onOpen = vi.fn();
    const onNewCode = vi.fn();
    render(windowOf({ isChanging: true, onOpen, onNewCode }));

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(onOpen).not.toHaveBeenCalled();
    expect(onNewCode).not.toHaveBeenCalled();
  });

  it('shows the code, the picture and what is left of the window while it is open', () => {
    render(windowOf({ pairing: OPEN, left: '14:32' }));

    expect(screen.getByText('matter.labels.window-left')).toBeInTheDocument();
    expect(screen.getByText('2333-171-2339')).toBeInTheDocument();
    expect(screen.getByText('MT:Y.K9042C00KA0648G00')).toBeInTheDocument();
    // The picture is asked for by the tag of the payload: the payload is a credential and
    // must not travel in a query string.
    expect(screen.getByAltText('matter.labels.qr-alt')).toHaveAttribute('src', '/matter/pairing.svg?v=abcdef12');
    expect(theAlert()).toHaveClass('alertMessage-info');
  });

  it('lets an open window be closed, and offers neither to open one nor to change the code', () => {
    const onClose = vi.fn();
    render(windowOf({ pairing: OPEN, left: '14:32', onClose }));

    expect(screen.queryByText('matter.buttons.open-window')).not.toBeInTheDocument();
    expect(screen.queryByText('matter.buttons.new-code')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('matter.buttons.close-window'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('is not a live region while it counts down, or every second would be read aloud', () => {
    render(windowOf({ pairing: OPEN, left: '14:32' }));

    expect(theAlert()).toHaveAttribute('aria-live', 'off');
    expect(theAlert()).not.toHaveAttribute('role', 'alert');
  });

  it('says that the bridge refused, whichever face it has', () => {
    const { rerender } = render(windowOf({ hasFailed: true }));
    expect(screen.getByText('matter.labels.window-failed')).toBeInTheDocument();

    rerender(windowOf({ hasFailed: true, pairing: OPEN, left: '14:32' }));
    expect(screen.getByText('matter.labels.window-failed')).toBeInTheDocument();

    rerender(windowOf({ pairing: OPEN, left: '14:32' }));
    expect(screen.queryByText('matter.labels.window-failed')).not.toBeInTheDocument();
  });
});
