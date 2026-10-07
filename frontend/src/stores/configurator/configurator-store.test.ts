import ConfiguratorStore, { ConfigFormatError } from './configurator-store';

const yaml = `
version: '1.0'
devices:
  - did: 10
    name: Реле
    type: switch
    module: wb-gpio
    adapter_settings: { matter: true, alice: false }
    services:
      - sid: 1
        role: on_off
        binding: { state: /devices/wb-gpio/controls/A1_OUT }
  - did: 30
    name: X
    type: thermostat
    module: m
    services: []
`;

describe('ConfiguratorStore.importConfig', () => {
  it('replaces the model with the file as unsaved changes and revert restores everything', () => {
    const store = new ConfiguratorStore();

    expect(store.importConfig(yaml)).toBe(2);
    expect(store.wbs.map((wb) => wb.id)).toEqual(['wb-gpio']);
    expect(store.raw).toHaveLength(1);
    expect(store.selection).toEqual({ kind: 'wb', id: 'wb-gpio' });
    expect(store.isDirty).toBe(true);

    store.revert();
    expect(store.wbs).toEqual([]);
    expect(store.raw).toEqual([]);
    expect(store.isDirty).toBe(false);
  });

  it('rejects a file without a devices list and keeps the model', () => {
    const store = new ConfiguratorStore();

    expect(() => store.importConfig('version: 1.0\n')).toThrow(ConfigFormatError);
    expect(store.isDirty).toBe(false);
  });
});
