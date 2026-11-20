// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { configuratorStore } from '@/stores/configurator';
import { fireEvent, render, screen } from '@/test/render';
import { WbDialog } from './wb-dialog';

const { controls, CLASSES } = vi.hoisted(() => ({
  controls: {} as Record<string, string[]>,
  CLASSES: {
    Temperature: 'temp', Humidity: 'hum', K1: 'bin_rw', K2: 'bin_rw', 'Channel 1': 'level',
  } as Record<string, string>,
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

const show = (found: Record<string, string[]>) => {
  Object.keys(controls).forEach((id) => delete controls[id]);
  Object.assign(controls, found);
  runInAction(() => {
    configuratorStore.devices = [];
  });
  const onAdded = vi.fn();
  render(<WbDialog isOpened onAdded={onAdded} onClose={vi.fn()} />);
  return onAdded;
};

const tiles = () => Array.from(document.querySelectorAll('.configurator-wbModelFound')).map((tile) => [
  tile.querySelector('.configurator-listTitle').textContent,
  tile.querySelector('.configurator-wbCount').textContent,
]);
const openModel = (title: string) => fireEvent.click(
  Array.from(document.querySelectorAll('.configurator-wbModelFound')).find((tile) => tile.textContent.includes(title)),
);
const create = () => fireEvent.click(screen.getByRole('button', { name: 'configurator.buttons.create-devices' }));
const typeButtons = (unit: number) =>
  Array.from(document.querySelectorAll('.configurator-channel')[unit].querySelectorAll('.configurator-choice button'));
const made = () => configuratorStore.devices.map((device) => [
  device.name, device.rows.map((row) => [row.type, row.bind]),
]);

describe('WbDialog models step', () => {
  it('shows a tile per model found on the controller with the number of such devices and creates nothing', () => {
    show({
      'wb-msw-v4_90': ['Temperature'], 'wb-msw-v4_91': ['Temperature'], 'wb-mrps6_12': ['K1'], 'wb-none_1': ['K1'],
    });

    expect(tiles()).toEqual([['WB-MSW v.4', '2'], ['WB-MRPS6', '1']]);

    openModel('WB-MRPS6');
    expect(configuratorStore.devices).toEqual([]);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('lists the supported models that are not on the controller and leaves out the ones that are', () => {
    show({ 'wb-msw-v4_90': ['Temperature'] });

    const models = Array.from(document.querySelectorAll('.configurator-wbModelAbsent .configurator-listTitle'))
      .map((title) => title.textContent);

    expect(models).toContain('WB-MDM3');
    expect(models).not.toContain('WB-MSW v.4');
  });

  it('says there is nothing to add when no device has a recipe', () => {
    show({ 'wb-none_1': ['Channel 1'] });

    expect(screen.getByText('configurator.labels.wb-none')).toBeTruthy();
    expect(document.querySelectorAll('.configurator-wbModelFound')).toHaveLength(0);
  });
});

describe('WbDialog setup step', () => {
  it('makes a separate device of every checked relay output, a light by default, and opens the overview', () => {
    const onAdded = show({ 'wb-mrps6_12': ['K1', 'K2'] });
    openModel('WB-MRPS6');

    expect(typeButtons(0).map((button) => button.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);
    create();

    expect(configuratorStore.devices.map((device) => device.rows)).toEqual([
      [expect.objectContaining({ type: 'light', bind: { on_off: 'wb-mrps6_12/K1' } })],
      [expect.objectContaining({ type: 'light', bind: { on_off: 'wb-mrps6_12/K2' } })],
    ]);
    expect(new Set(configuratorStore.devices.map((device) => device.name)).size).toBe(2);
    expect(configuratorStore.isOverview).toBe(true);
    expect(onAdded).not.toHaveBeenCalled();
  });

  it('skips an unchecked output and applies the type picked for the other one, opening its card', () => {
    const onAdded = show({ 'wb-mrps6_12': ['K1', 'K2'] });
    openModel('WB-MRPS6');

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(typeButtons(1)[0]);
    create();

    expect(configuratorStore.devices.map((device) => device.rows.map((row) => [row.type, row.bind]))).toEqual([
      [['switch', { on_off: 'wb-mrps6_12/K2' }]],
    ]);
    expect(onAdded).toHaveBeenCalledTimes(1);
  });

  it('keeps a sensor as one device and lists every device of the model under its own heading', () => {
    show({ 'wb-msw-v4_90': ['Temperature', 'Humidity'], 'wb-msw-v4_91': ['Temperature'] });
    openModel('WB-MSW v.4');

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'WB-MSW-V4_90', 'WB-MSW-V4_91',
    ]);
    expect(document.querySelectorAll('.configurator-choice')).toHaveLength(0);
    create();

    expect(made()).toEqual([
      ['WB-MSW-V4_90', [
        ['temperature_sensor', { temperature: 'wb-msw-v4_90/Temperature' }],
        ['humidity_sensor', { humidity: 'wb-msw-v4_90/Humidity' }],
      ]],
      ['WB-MSW-V4_91', [['temperature_sensor', { temperature: 'wb-msw-v4_91/Temperature' }]]],
    ]);
  });

  it('drops the brightness of a dimmer channel that is switched from a light to a relay', () => {
    show({ 'wb-mdm3_7': ['K1', 'Channel 1'] });
    openModel('WB-MDM3');
    expect(typeButtons(0).map((button) => button.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);

    fireEvent.click(typeButtons(0)[0]);
    create();

    expect(configuratorStore.devices[0].rows.map((row) => [row.type, row.bind])).toEqual([
      ['switch', { on_off: 'wb-mdm3_7/K1' }],
    ]);
  });

  it('returns to the models by the back button with nothing created', () => {
    show({ 'wb-mrps6_12': ['K1'] });
    openModel('WB-MRPS6');

    fireEvent.click(screen.getByRole('button', { name: 'configurator.buttons.wb-back' }));

    expect(tiles()).toEqual([['WB-MRPS6', '1']]);
    expect(configuratorStore.devices).toEqual([]);
  });
});
