// @vitest-environment happy-dom
import type { MatterFabric } from '@/stores/matter';
import { fireEvent, render, screen } from '@/test/render';
import { AppMenuAction } from '../types';
import { AppsCard } from './apps-card';

const fabric = (over: Partial<MatterFabric> = {}): MatterFabric => (
  { index: 14, label: 'Home Assistant', vendor_id: 0x132F, ...over }
);

/** The menu button of a row, which carries the only label it has. */
const menuButton = (index = 0) => screen.getAllByLabelText('matter.buttons.app-actions')[index];

describe('AppsCard', () => {
  it('says so instead of showing an empty table when nothing is paired', () => {
    render(<AppsCard fabrics={[]} onAction={vi.fn()} />);

    expect(screen.getByText('matter.labels.ecosystems-empty')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.column-app')).not.toBeInTheDocument();
  });

  it('shows the pairing date as an absolute date, so rows can be compared', () => {
    // The column beside it is relative and this one is not, on purpose: this is the
    // reference fact, and "3 days ago" cannot be lined up between rows.
    render(<AppsCard fabrics={[fabric({ paired_at: Date.UTC(2026, 10, 14, 9, 5) })]} onAction={vi.fn()} />);

    expect(screen.getByText(/14\/11\/2026/)).toBeInTheDocument();
  });

  it('says "before" for an app that was paired before the bridge kept dates', () => {
    render(<AppsCard fabrics={[fabric()]} fabricsSince={Date.UTC(2026, 10, 1)} onAction={vi.fn()} />);

    expect(screen.getByText('matter.labels.paired-before')).toBeInTheDocument();
  });

  it('admits it does not know when there is no date and nothing to measure from', () => {
    render(<AppsCard fabrics={[fabric()]} onAction={vi.fn()} />);

    expect(screen.getByText('matter.labels.paired-unknown')).toBeInTheDocument();
  });

  it('shows an app with no channel as plain offline, with no time invented for it', () => {
    // The usual case: the moment of a break is only written down when one happens, so
    // after a restart of the service no app has one.
    render(<AppsCard fabrics={[fabric({ online: false })]} onAction={vi.fn()} />);

    expect(screen.getByText('matter.labels.link-offline')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.link-quiet')).not.toBeInTheDocument();
  });

  it('marks an app that is on the line, and not by colour alone', () => {
    render(<AppsCard fabrics={[fabric({ online: true })]} onAction={vi.fn()} />);

    expect(screen.getByText('matter.labels.link-online')).toBeInTheDocument();
  });

  it('keeps unpairing behind the menu, so a stray click cannot reach it', () => {
    // Unpairing from here cannot be undone in the app, which keeps the bridge in its own
    // list until somebody deletes it there. A button one row off is a click somebody
    // will make.
    render(<AppsCard fabrics={[fabric()]} onAction={vi.fn()} />);

    expect(screen.queryByText('matter.buttons.unpair')).not.toBeInTheDocument();
  });

  it('names the app in the menu and shows the two numbers that identify it', () => {
    render(<AppsCard fabrics={[fabric({ label: '' })]} onAction={vi.fn()} />);

    fireEvent.click(menuButton());

    expect(screen.getByText('matter.labels.app-ids')).toBeInTheDocument();
    expect(screen.getByText('matter.buttons.rename')).toBeInTheDocument();
    expect(screen.getByText('matter.buttons.unpair')).toBeInTheDocument();
  });

  it('reports which app and which action were chosen', () => {
    const onAction = vi.fn();
    const paired = fabric({ index: 9 });
    render(<AppsCard fabrics={[paired]} onAction={onAction} />);
    fireEvent.click(menuButton());

    fireEvent.click(screen.getByText('matter.buttons.unpair'));

    expect(onAction).toHaveBeenCalledWith(paired, AppMenuAction.Unpair);
  });

  it('closes the menu once something is chosen', () => {
    render(<AppsCard fabrics={[fabric()]} onAction={vi.fn()} />);
    fireEvent.click(menuButton());

    fireEvent.click(screen.getByText('matter.buttons.rename'));

    expect(screen.queryByText('matter.buttons.rename')).not.toBeInTheDocument();
  });

  it('closes the menu on Escape, like every other popup on the page', () => {
    render(<AppsCard fabrics={[fabric()]} onAction={vi.fn()} />);
    fireEvent.click(menuButton());

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('matter.buttons.rename')).not.toBeInTheDocument();
  });

  it('closes the menu when something else on the page is clicked', () => {
    render(<AppsCard fabrics={[fabric()]} onAction={vi.fn()} />);
    fireEvent.click(menuButton());

    fireEvent.mouseDown(document.body);

    expect(screen.queryByText('matter.buttons.rename')).not.toBeInTheDocument();
  });

  it('never leaves two menus open at once', () => {
    // The listener is on the document, so pressing the second button closes the first
    // menu as well as opening the second.
    const two = [fabric({ index: 8 }), fabric({ index: 9 })];
    render(<AppsCard fabrics={two} onAction={vi.fn()} />);

    fireEvent.click(menuButton(0));
    fireEvent.mouseDown(menuButton(1));
    fireEvent.click(menuButton(1));

    expect(screen.getAllByText('matter.buttons.rename')).toHaveLength(1);
  });
});
