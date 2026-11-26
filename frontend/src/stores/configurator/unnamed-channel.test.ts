import ConfiguratorStore from './configurator-store';
import { toConfig } from './model';
import type { Device, DeviceRow, LiveControls } from './types';

vi.mock('i18next', () => ({ default: { t: (key: string) => key } }));

const live: LiveControls = { meta: () => ({ type: 'switch' }) };

const row = (did: number, name = ''): DeviceRow => ({ did, type: 'light', name, bind: { on_off: `wb-gpio/A${did}` } });

const lamp = (rows: DeviceRow[]): Device =>
  ({ id: 'd', name: 'Лампа', group: '', adapterSettings: {}, rows });

const names = (device: Device) =>
  toConfig({ devices: [device], raw: [] }, live, {}).config.devices.map((item) => item.name);

describe('unnamed channel', () => {
  it('writes no name for the only channel without its own name and keeps a name the user gave', () => {
    expect(names(lamp([row(1)]))).toEqual([undefined]);
    expect(names(lamp([row(1, 'Над столом')]))).toEqual(['Над столом']);
  });

  it('names every channel once a second is added and drops the name again when it is left alone', () => {
    expect(names(lamp([row(1), row(2)]))).toEqual(['Лампа', 'Лампа configurator.types.light.short 2']);
    expect(names(lamp([row(1)]))).toEqual([undefined]);
  });

  it('saves the channel without a name key and reads it back as a channel named like its device', () => {
    const store = new ConfiguratorStore();
    const text = store.toYaml(toConfig({ devices: [lamp([row(1)])], raw: [] }, live, {}).config);
    expect(text).not.toMatch(/^ {4}name:/m);

    store.importConfig(text);
    expect(store.devices.map((device) => [device.name, device.rows[0].name])).toEqual([['Лампа', '']]);
  });
});
