// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { configuratorStore, type Device } from '@/stores/configurator';
import { fireEvent, render, screen } from '@/test/render';
import { AddDialog } from './add-dialog';

const cells = [
  { id: 'relay/K1', controlId: 'K1', name: 'K1' },
  { id: 'relay/K2', controlId: 'K2', name: 'K2' },
  { id: 'dimmer/Level', controlId: 'Level', name: 'Level' },
];

vi.mock('../utils', async (importOriginal) => ({
  ...await importOriginal() as Record<string, unknown>,
  listDevices: () => ['relay', 'dimmer'],
  deviceControls: (id: string) => cells.filter((cell) => cell.id.startsWith(`${id}/`)),
  deviceTitle: (id: string) => (id === 'relay' ? 'Relay' : 'Dimmer'),
  classifyCell: (cell: { controlId: string }) => ({ cls: cell.controlId === 'Level' ? 'level' : 'bin_rw' }),
  isSystemDevice: () => false,
  isVirtualDevice: () => false,
  formatValue: () => '0',
}));
vi.mock('@/components/dialog', () => ({
  Dialog: ({ children, isOpened }: any) => (isOpened ? <div>{children}</div> : null),
}));

const channelBoxes = () => screen.getAllByRole('checkbox', { name: /show-channel/ }) as HTMLInputElement[];
const checkedCount = () => channelBoxes().filter((input) => input.checked).length;
const pickedList = () => screen.getByRole('list', { name: 'configurator.labels.picked-channels' });
const addButton = (label: string) => screen.getByRole('button', { name: label }) as HTMLButtonElement;

beforeEach(() => {
  runInAction(() => {
    configuratorStore.devices = [];
  });
});

describe('AddDialog channel selection', () => {
  it('checks nothing in advance and checks the suitable channels of the device by the button', () => {
    render(<AddDialog isOpened onAdded={vi.fn()} onClose={vi.fn()} />);
    expect(checkedCount()).toBe(0);
    expect(addButton('configurator.buttons.add-device').disabled).toBe(true);

    fireEvent.click(addButton('configurator.buttons.pick-suitable'));

    expect(checkedCount()).toBe(2);
  });

  it('preselects nothing when channels are added to an existing device', () => {
    const target: Device = { id: 'd', name: 'd', group: '', matter: true, rows: [] };
    render(<AddDialog target={target} isOpened onClose={vi.fn()} />);

    expect(checkedCount()).toBe(0);
    expect(addButton('configurator.buttons.add-channels').disabled).toBe(true);
  });

  it('keeps the checked channels across controller devices and makes one device of them all', () => {
    render(<AddDialog isOpened onAdded={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(channelBoxes()[0]);
    fireEvent.click(screen.getByRole('button', { name: /Dimmer/ }));
    fireEvent.click(channelBoxes()[0]);
    fireEvent.click(addButton('configurator.buttons.add-device'));

    expect(configuratorStore.devices).toHaveLength(1);
    expect(configuratorStore.devices[0].name).toBe('configurator.labels.new-device');
    expect(configuratorStore.devices[0].rows.map((row) => Object.values(row.bind))).toEqual([
      ['relay/K1'], ['dimmer/Level'],
    ]);
  });

  it('names the device after the controller device when all its channels come from that one', () => {
    render(<AddDialog isOpened onAdded={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(channelBoxes()[1]);
    fireEvent.click(addButton('configurator.buttons.add-device'));

    expect(configuratorStore.devices[0].name).toBe('Relay');
  });

  it('gives an ambiguous channel the first type and asks to check it until the user picks the type', () => {
    render(<AddDialog isOpened onAdded={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Dimmer/ }));

    fireEvent.click(channelBoxes()[0]);
    expect(screen.getByText('configurator.labels.type-guessed')).toBeTruthy();
    expect(addButton('configurator.buttons.add-device').disabled).toBe(false);

    fireEvent.click(document.querySelectorAll('.configurator-choice button')[1]);
    expect(screen.queryByText('configurator.labels.type-guessed')).toBeNull();
  });

  it('disables the suitable button when nothing is left to check and explains a device without suitable ones', () => {
    render(<AddDialog isOpened onAdded={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(addButton('configurator.buttons.pick-suitable'));
    expect(addButton('configurator.buttons.pick-suitable').disabled).toBe(true);
    expect(screen.queryByText('configurator.labels.no-suitable')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Dimmer/ }));
    expect(addButton('configurator.buttons.pick-suitable').disabled).toBe(true);
    expect(screen.getByText('configurator.labels.no-suitable')).toBeTruthy();
  });

  it('moves the channels checked by the button to the top, a manual check keeps the channel in place', () => {
    const names = () => channelBoxes().map((input) => input.getAttribute('title') ?? input.parentElement.textContent);
    render(<AddDialog isOpened onAdded={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(channelBoxes()[1]);
    expect(channelBoxes().map((input) => input.checked)).toEqual([false, true]);

    fireEvent.click(addButton('configurator.buttons.pick-suitable'));
    fireEvent.click(channelBoxes()[0]);

    expect(names()).toEqual(['K2', 'K1']);
    expect(channelBoxes().map((input) => input.checked)).toEqual([true, false]);
  });

  it('checks and clears all the channels of the current device only, keeping the picks of the other devices', () => {
    render(<AddDialog isOpened onAdded={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Dimmer/ }));
    fireEvent.click(channelBoxes()[0]);
    fireEvent.click(screen.getByRole('button', { name: /Relay/ }));
    expect(addButton('configurator.buttons.pick-none').disabled).toBe(true);

    fireEvent.click(addButton('configurator.buttons.pick-all'));
    expect(checkedCount()).toBe(2);
    expect(addButton('configurator.buttons.pick-all').disabled).toBe(true);
    expect(pickedList().children).toHaveLength(3);

    fireEvent.click(addButton('configurator.buttons.pick-none'));
    expect(checkedCount()).toBe(0);
    expect(pickedList().textContent).toBe('Level · Dimmer');
  });

  it('lists the picked channels with their devices and removes one by its cross', () => {
    render(<AddDialog isOpened onAdded={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole('list', { name: 'configurator.labels.picked-channels' })).toBeNull();

    fireEvent.click(addButton('configurator.buttons.pick-all'));
    fireEvent.click(screen.getAllByRole('button', { name: 'configurator.labels.unpick' })[0]);

    expect(pickedList().textContent).toBe('K2 · Relay');
    expect(channelBoxes().map((input) => input.checked)).toEqual([false, true]);
  });
});
