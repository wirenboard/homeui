// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { configuratorStore } from '@/stores/configurator';
import { act, fireEvent, render, screen } from '@/test/render';
import { DevicesDialog } from './devices-dialog';

const { controls, CLASSES } = vi.hoisted(() => ({
  controls: {} as Record<string, string[]>,
  CLASSES: { K1: 'bin_rw', K2: 'bin_rw', Temperature: 'temp' } as Record<string, string>,
}));

vi.mock('../utils', async (importOriginal) => ({
  ...await importOriginal() as Record<string, unknown>,
  listDevices: () => Object.keys(controls),
  deviceControls: (id: string) => controls[id]
    .map((controlId) => ({ id: `${id}/${controlId}`, controlId, name: controlId })),
  deviceTitle: (id: string) => id.toUpperCase(),
  classifyCell: ({ controlId }: { controlId: string }) => ({ cls: CLASSES[controlId] ?? 'none' }),
}));
vi.mock('@/components/dialog', () => ({
  Dialog: ({ children, isOpened }: any) => (isOpened ? <div>{children}</div> : null),
}));
vi.mock('@/components/dropdown', () => ({
  Dropdown: ({ ariaLabel, value, onChange }: any) => (
    <input
      aria-label={ariaLabel}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value ? { value: event.target.value, label: '' } : null)}
    />
  ),
}));

const show = (found: Record<string, string[]>) => {
  Object.keys(controls).forEach((id) => delete controls[id]);
  Object.assign(controls, found);
  runInAction(() => {
    configuratorStore.devices = [];
  });
  const props = { onAdded: vi.fn(), onCompose: vi.fn() };
  render(<DevicesDialog isOpened onClose={vi.fn()} {...props} />);
  return props;
};

const createButton = () =>
  screen.getByRole('button', { name: 'configurator.buttons.create-devices' }) as HTMLButtonElement;
const rowBoxes = () => Array.from(document.querySelectorAll('li.configurator-channel input[type=checkbox]')) as
  HTMLInputElement[];
const made = () => configuratorStore.devices.map((device) => [
  device.name, device.group, device.rows.map((row) => row.bind),
]);

describe('DevicesDialog', () => {
  it('checks nothing in advance, then a row once named or grouped; its only channel takes the device name', () => {
    const { onAdded } = show({ 'wb-mrps6_12': ['K1', 'K2'] });
    expect(rowBoxes().map((box) => box.checked)).toEqual([false, false]);
    expect(createButton().disabled).toBe(true);

    fireEvent.change(screen.getAllByRole('textbox', { name: 'configurator.labels.wb-name' })[0], {
      target: { value: 'Люстра' },
    });
    fireEvent.change(screen.getAllByRole('textbox', { name: /^configurator.labels.group/ })[0], {
      target: { value: 'Гостиная' },
    });
    expect(rowBoxes().map((box) => box.checked)).toEqual([true, false]);
    fireEvent.click(createButton());

    expect(made()).toEqual([['Люстра', 'Гостиная', [{ on_off: 'wb-mrps6_12/K1' }]]]);
    expect(configuratorStore.devices[0].rows[0].name).toBe('');
    expect(onAdded).toHaveBeenCalledTimes(1);
  });

  it('shows the devices of one model by its filter and resets the model once the device type changes', () => {
    show({ 'wb-mrps6_12': ['K1'], gpio: ['K1', 'Temperature'] });
    const titles = () => screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(titles()).toEqual(['WB-MRPS6_12', 'GPIO']);

    fireEvent.click(screen.getByRole('button', { name: /^WB-MRPS6/ }));
    expect(titles()).toEqual(['WB-MRPS6_12']);
    fireEvent.change(screen.getByRole('textbox', { name: 'devices.labels.filter-type' }), {
      target: { value: 'all' },
    });
    expect(titles()).toEqual(['WB-MRPS6_12', 'GPIO']);
  });

  it('rebinds a channel, names an untouched row after the controller device and hands over to composing', () => {
    const { onCompose } = show({ 'wb-mrps6_12': ['K1', 'K2'] });
    fireEvent.click(screen.getAllByRole('button', { name: 'configurator.buttons.channels' })[0]);
    fireEvent.change(screen.getByRole('textbox', { name: 'configurator.labels.channel-for-role' }), {
      target: { value: 'wb-mrps6_12/K2' },
    });
    fireEvent.click(rowBoxes()[0]);
    fireEvent.click(createButton());

    expect(made()).toEqual([['WB-MRPS6_12 · configurator.labels.recipe-channel', '', [{ on_off: 'wb-mrps6_12/K2' }]]]);

    fireEvent.click(screen.getByRole('button', { name: 'configurator.buttons.compose' }));
    expect(onCompose).toHaveBeenCalledTimes(1);
  });

  it('folds the devices when several are shown, keeps the device box working and expands them all at once', () => {
    show({ 'wb-mrps6_12': ['K1', 'K2'], gpio: ['K1'] });
    const toggles = () => screen.getAllByRole('button', { name: 'configurator.labels.toggle-device' });
    expect(toggles().map((button) => button.getAttribute('aria-expanded'))).toEqual(['false', 'false']);
    expect(rowBoxes()).toHaveLength(0);

    fireEvent.click(screen.getAllByRole('checkbox', { name: 'configurator.labels.wb-check-device' })[0]);
    expect(document.querySelector('.configurator-wbSummary').textContent)
      .toContain('configurator.labels.wb-devices-count');

    fireEvent.click(toggles()[1]);
    expect(rowBoxes()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'configurator.buttons.collapse-all' }));
    expect(rowBoxes()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'configurator.buttons.expand-all' }));
    expect(rowBoxes().map((box) => box.checked)).toEqual([true, true, false]);
  });

  it('finds a device by its name or id and expands it when it is the only one found', () => {
    show({ 'wb-mrps6_12': ['K1'], gpio: ['K1'] });
    const titles = () => screen.queryAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    const search = (text: string) => fireEvent.change(
      screen.getByRole('searchbox', { name: 'configurator.labels.wb-search' }),
      { target: { value: text } },
    );

    search('mrps');
    expect(titles()).toEqual(['WB-MRPS6_12']);
    expect(rowBoxes()).toHaveLength(1);

    search('nothing');
    expect(titles()).toEqual([]);
    expect(screen.getByText('configurator.labels.nothing-found')).toBeTruthy();
  });

  it('explains under a checked row why its name does not fit: taken, repeated or empty', () => {
    show({ 'wb-mrps6_12': ['K1', 'K2'] });
    act(() => runInAction(() => {
      configuratorStore.devices = [{ id: 'd0', name: 'Люстра', group: '', adapterSettings: {}, rows: [] }];
    }));
    const names = screen.getAllByRole('textbox', { name: 'configurator.labels.wb-name' });
    const errors = () => Array.from(document.querySelectorAll('.configurator-wbNameError'))
      .map((error) => error.textContent);

    fireEvent.change(names[0], { target: { value: 'Люстра' } });
    expect(errors()).toEqual(['configurator.labels.wb-name-taken']);
    fireEvent.change(names[0], { target: { value: 'Бра' } });
    fireEvent.change(names[1], { target: { value: 'бра' } });
    expect(errors()).toEqual(['configurator.labels.wb-name-repeat', 'configurator.labels.wb-name-repeat']);
    fireEvent.change(names[1], { target: { value: ' ' } });
    expect(errors()).toEqual(['configurator.labels.wb-name-empty']);
    expect(createButton().disabled).toBe(true);
  });
});
