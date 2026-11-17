// @vitest-environment happy-dom
import type { MatterFabric } from '@/stores/matter';
import { fireEvent, render, screen } from '@/test/render';
import { FabricMenuAction } from '../types';
import { FabricsCard } from './fabrics-card';

const fabric = (over: Partial<MatterFabric> = {}): MatterFabric => (
  { index: 14, adminFabricLabel: 'Home Assistant', vendor_id: 0x132F, ...over }
);

/** The menu button of a row, which carries the only label it has. */
const menuButton = (index = 0) => screen.getAllByLabelText('matter.buttons.fabric-actions')[index];

describe('FabricsCard', () => {
  // The shared Popup renders its content into <div class="floating">, which the app
  // shell provides (layouts/app/app.tsx). Without it floating-ui has no root and draws
  // nothing - the menu opens, aria-expanded flips, and the content is simply not in the
  // document. Nothing else in the suite opens a Popup, so there was no precedent to copy.
  let floatingRoot: HTMLDivElement;

  beforeEach(() => {
    floatingRoot = document.createElement('div');
    floatingRoot.className = 'floating';
    document.body.append(floatingRoot);
  });

  afterEach(() => {
    floatingRoot.remove();
  });

  it('says so instead of showing an empty table when nothing is paired', () => {
    render(<FabricsCard fabrics={[]} onAction={vi.fn()} />);

    expect(screen.getByText('matter.labels.fabrics-empty')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.column-fabric')).not.toBeInTheDocument();
  });

  it('shows the pairing date as an absolute date, so rows can be compared', () => {
    // The column beside it is relative and this one is not, on purpose: this is the
    // reference fact, and "3 days ago" cannot be lined up between rows.
    render(<FabricsCard fabrics={[fabric({ paired_at: Date.UTC(2026, 10, 14, 9, 5) })]} onAction={vi.fn()} />);

    expect(screen.getByText(/14\/11\/2026/)).toBeInTheDocument();
  });

  it('says "before" for a fabric that was paired before the bridge kept dates', () => {
    render(<FabricsCard fabrics={[fabric()]} fabricsSince={Date.UTC(2026, 10, 1)} onAction={vi.fn()} />);

    expect(screen.getByText('matter.labels.paired-before')).toBeInTheDocument();
  });

  it('admits it does not know when there is no date and nothing to measure from', () => {
    render(<FabricsCard fabrics={[fabric()]} onAction={vi.fn()} />);

    expect(screen.getByText('matter.labels.paired-unknown')).toBeInTheDocument();
  });

  it('shows a fabric with no channel as plain offline, with no time invented for it', () => {
    // The usual case: the moment of a break is only written down when one happens, so
    // after a restart of the service no fabric has one.
    render(<FabricsCard fabrics={[fabric({ online: false })]} onAction={vi.fn()} />);

    expect(screen.getByText('matter.labels.link-offline')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.link-quiet')).not.toBeInTheDocument();
  });

  it('marks a fabric that is on the line, and not by colour alone', () => {
    render(<FabricsCard fabrics={[fabric({ online: true })]} onAction={vi.fn()} />);

    expect(screen.getByText('matter.labels.link-online')).toBeInTheDocument();
  });

  it('marks an unlabelled fabric beside the number, not inside the label', () => {
    // Folded into the label in the same weight, the note read as part of the label - the
    // row said "Fabric no. 15 (no label set)" as if that were what it is called.
    render(<FabricsCard fabrics={[fabric({ adminFabricLabel: '', vendor_id: 0x1037 })]} onAction={vi.fn()} />);

    expect(screen.getByText('matter.labels.fabric-unlabelled')).toBeInTheDocument();
    expect(screen.getByText('matter.labels.fabric-no-label')).toBeInTheDocument();
  });

  it('says nothing of the sort about a fabric that carries a label of its own', () => {
    render(<FabricsCard fabrics={[fabric()]} onAction={vi.fn()} />);

    expect(screen.queryByText('matter.labels.fabric-no-label')).not.toBeInTheDocument();
  });

  it('marks a label set on this controller with what it replaced', () => {
    // A label typed here exists nowhere else, so an operator comparing this page with the
    // app's own screen has to be able to see which of the two names is ours - and what
    // clearing it would bring back.
    render(
      <FabricsCard fabrics={[fabric({ localFabricLabel: 'Hall phone' })]} onAction={vi.fn()} />,
    );

    expect(screen.getByText('Hall phone')).toBeInTheDocument();
    expect(screen.getByText('matter.labels.fabric-label-instead')).toBeInTheDocument();
    expect(screen.queryByText('matter.labels.fabric-no-label')).not.toBeInTheDocument();
  });

  it('keeps unpairing behind the menu, so a stray click cannot reach it', () => {
    // Unpairing from here cannot be undone in the app, which keeps the bridge in its own
    // list until somebody deletes it there. A button one row off is a click somebody
    // will make.
    render(<FabricsCard fabrics={[fabric()]} onAction={vi.fn()} />);

    expect(screen.queryByText('matter.buttons.unpair')).not.toBeInTheDocument();
  });

  it('names the fabric in the menu and shows the vendor that identifies it', () => {
    render(<FabricsCard fabrics={[fabric({ adminFabricLabel: '' })]} onAction={vi.fn()} />);

    fireEvent.click(menuButton());

    expect(screen.getByText('matter.labels.fabric-ids')).toBeInTheDocument();
    expect(screen.getByText('matter.buttons.set-label')).toBeInTheDocument();
    expect(screen.getByText('matter.buttons.unpair')).toBeInTheDocument();
  });

  it('reports which fabric and which action were chosen', () => {
    const onAction = vi.fn();
    const paired = fabric({ index: 9 });
    render(<FabricsCard fabrics={[paired]} onAction={onAction} />);
    fireEvent.click(menuButton());

    fireEvent.click(screen.getByText('matter.buttons.unpair'));

    expect(onAction).toHaveBeenCalledWith(paired, FabricMenuAction.Unpair);
  });

  it('closes the menu once something is chosen', () => {
    render(<FabricsCard fabrics={[fabric()]} onAction={vi.fn()} />);
    fireEvent.click(menuButton());

    fireEvent.click(screen.getByText('matter.buttons.set-label'));

    expect(screen.queryByText('matter.buttons.set-label')).not.toBeInTheDocument();
  });

  it('renders the menu outside the table, not inside the cell', () => {
    // The table sets `.wb-tableCell * { z-index: 1 }`, which flattens every descendant of
    // a cell to one layer; paint order then falls back to the DOM, and a menu built
    // inside the cell was drawn under the rows below it. The shared Popup renders through
    // a portal, so the menu is not in the table at all and the rule cannot reach it.
    const { container } = render(<FabricsCard fabrics={[fabric()]} onAction={vi.fn()} />);

    fireEvent.click(menuButton());

    expect(screen.getByText('matter.buttons.set-label')).toBeInTheDocument();
    expect(container.querySelector('.matter-fabricMenuContent')).toBeNull();
  });

  it('closes the menu on Escape, like every other popup on the page', () => {
    render(<FabricsCard fabrics={[fabric()]} onAction={vi.fn()} />);
    fireEvent.click(menuButton());

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('matter.buttons.set-label')).not.toBeInTheDocument();
  });

  it('closes the menu when something else on the page is clicked', () => {
    render(<FabricsCard fabrics={[fabric()]} onAction={vi.fn()} />);
    fireEvent.click(menuButton());

    // A column heading, and a pointer press: useDismiss watches pointerdown and decides
    // by the event target, so pressing the bare document proves less than pressing
    // something real. Not the row's own name - the open menu repeats it in its heading.
    fireEvent.pointerDown(screen.getByText('matter.labels.column-paired'));

    expect(screen.queryByText('matter.buttons.set-label')).not.toBeInTheDocument();
  });

  it('never leaves two menus open at once', () => {
    // Pressing the second button is an outside press for the first menu, so it closes
    // before the second opens.
    const two = [fabric({ index: 8 }), fabric({ index: 9 })];
    render(<FabricsCard fabrics={two} onAction={vi.fn()} />);

    fireEvent.click(menuButton(0));
    fireEvent.pointerDown(menuButton(1));
    fireEvent.click(menuButton(1));

    expect(screen.getAllByText('matter.buttons.set-label')).toHaveLength(1);
  });
});
