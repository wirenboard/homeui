// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@/test/render';
import { AboutCard } from './about-card';

const ABOUT = {
  name: 'WB-bridge-TEST',
  matter_version: '1.6.0',
  identity_since: new Date(2026, 10, 25, 23, 48).getTime(),
};

const cardOf = (props = {}) => (
  <AboutCard
    about={ABOUT}
    version="0.0.1"
    isBusy={false}
    onReset={vi.fn()}
    {...props}
  />
);

/** What stands beside a name of a line of the card. */
const valueOf = (label: string) => screen.getByText(`matter.labels.${label}`).nextElementSibling?.textContent;

describe('AboutCard', () => {
  it('says of the bridge what the bridge said of itself, one line for each thing', () => {
    render(cardOf());

    expect(screen.getByText('matter.labels.about')).toBeInTheDocument();
    expect(valueOf('about-name')).toBe('WB-bridge-TEST');
    expect(valueOf('about-version')).toBe('0.0.1');
    expect(valueOf('about-matter')).toBe('1.6.0');
    // How many fabrics and devices there are is said by the cards above, not here.
    expect(screen.queryByText('matter.labels.about-fabrics')).not.toBeInTheDocument();
    expect(screen.queryByText('matter.labels.about-devices')).not.toBeInTheDocument();
  });

  it('has no line of the vendor: under a test number it said only that the bridge is not certified', () => {
    render(cardOf());

    expect(screen.queryByText('matter.labels.about-vendor')).not.toBeInTheDocument();
  });

  it('keeps every line for a bridge that says nothing of itself: the word is "unknown"', () => {
    render(cardOf({ about: undefined }));

    for (const label of ['about-name', 'about-matter']) {
      expect(valueOf(label)).toBe('matter.labels.about-unknown');
    }
    // What the page knows without it stays.
    expect(valueOf('about-version')).toBe('0.0.1');
  });

  it('says when the Matter node was made as one more parameter, the last of the lines', () => {
    render(cardOf());

    const lines = [...document.querySelectorAll('.matter-aboutLine')];
    expect(lines).toHaveLength(4);
    expect(lines[3].querySelector('dt').textContent).toBe('matter.labels.node-created');
    expect(valueOf('node-created')).toMatch(/^25.11.2026, 23:48/);
  });

  it('says "unknown" there when the bridge does not know when its node was made, and still offers the reset', () => {
    render(cardOf({ about: { ...ABOUT, identity_since: null } }));

    expect(valueOf('node-created')).toMatch(/^matter.labels.about-unknown/);
    expect(screen.getByRole('button', { name: 'matter.buttons.reset' })).toBeEnabled();
  });

  it('offers the reset in that very line, with what it costs said under the date', () => {
    const onReset = vi.fn();
    render(cardOf({ onReset }));

    const line = screen.getByText('matter.labels.node-created').parentElement;
    expect(line.contains(screen.getByText('matter.labels.reset-hint'))).toBe(true);
    expect(line.contains(screen.getByRole('button', { name: 'matter.buttons.reset' }))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'matter.buttons.reset' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('takes no press while another request to the bridge is on its way', () => {
    const onReset = vi.fn();
    render(cardOf({ isBusy: true, onReset }));

    const button = screen.getByRole('button', { name: 'matter.buttons.reset' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onReset).not.toHaveBeenCalled();
  });
});
