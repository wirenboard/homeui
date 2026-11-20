// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import { configuratorStore } from '@/stores/configurator';
import { fireEvent, render, screen } from '@/test/render';
import { WbDialog } from './wb-dialog';

const { controls } = vi.hoisted(() => ({ controls: {} as Record<string, string[]> }));

vi.mock('../utils', async (importOriginal) => ({
  ...await importOriginal() as Record<string, unknown>,
  listDevices: () => Object.keys(controls),
  deviceControls: (id: string) => controls[id].map((controlId) => ({ controlId })),
  deviceTitle: (id: string) => id.toUpperCase(),
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

describe('WbDialog', () => {
  it('creates a card per checked WB device with a recipe and opens the first one', () => {
    const onAdded = show({
      'wb-msw-v4_90': ['Temperature', 'Humidity'],
      'wb-mrps6_12': ['K1', 'K2'],
      'wb-mr6cv3_137': ['K1'],
    });

    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'configurator.buttons.create-devices' }));

    expect(configuratorStore.devices.map((device) => [device.name, device.rows.map((row) => row.type)])).toEqual([
      ['WB-MSW-V4_90', ['temperature_sensor', 'humidity_sensor']],
      ['WB-MRPS6_12', ['switch', 'switch']],
    ]);
    expect(configuratorStore.selected.name).toBe('WB-MSW-V4_90');
    expect(onAdded).toHaveBeenCalledTimes(1);
  });

  it('skips an unchecked device', () => {
    show({ 'wb-msw-v4_90': ['Temperature'], 'wb-mrps6_12': ['K1'] });

    fireEvent.click(screen.getByRole('checkbox', { name: 'WB-MRPS6_12' }));
    fireEvent.click(screen.getByRole('button', { name: 'configurator.buttons.create-devices' }));

    expect(configuratorStore.devices.map((device) => device.name)).toEqual(['WB-MSW-V4_90']);
  });

  it('says there is nothing to add when no device has a recipe', () => {
    show({ 'wb-mr6cv3_137': ['K1'] });

    expect(screen.getByText('configurator.labels.wb-none')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'configurator.buttons.create-devices' })).toBeNull();
  });
});
