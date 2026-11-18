import ConfiguratorStore, { ConfigFormatError, ConfigParseError } from './configurator-store';

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
    expect(store.devices.map((device) => device.name)).toEqual(['wb-gpio']);
    expect(store.raw).toHaveLength(1);
    expect(store.selection).toEqual({ id: 'module:wb-gpio' });
    expect(store.isDirty).toBe(true);

    store.revert();
    expect(store.devices).toEqual([]);
    expect(store.raw).toEqual([]);
    expect(store.isDirty).toBe(false);
  });

  it('rejects a file without a devices list and keeps the model', () => {
    const store = new ConfiguratorStore();

    expect(() => store.importConfig('version: 1.0\n')).toThrow(ConfigFormatError);
    expect(store.isDirty).toBe(false);
  });
});

const live = { meta: () => null };

const respond = (body: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  json: async () => body,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

// Ответы бэкенда по URL; POST на конфиг пишется в posts.
const stubBackend = (routes: { status?: unknown[]; config?: unknown; post?: unknown }) => {
  const statuses = [...(routes.status ?? [])];
  const posts: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { method?: string; body?: unknown }) => {
    if (url.endsWith('/status')) {
      const next = statuses.length > 1 ? statuses.shift() : statuses[0];
      return next instanceof Error ? Promise.reject(next) : next;
    }
    if (init?.method === 'POST') {
      posts.push(String(init.body));
      return routes.post ?? respond('');
    }
    return routes.config;
  }));
  return posts;
};

const status = (extra: object = {}) => respond({ has_config: true, parses: true, path: '/p.yaml', ...extra });

afterEach(() => {
  vi.unstubAllGlobals();
});

const mixedYaml = `
version: '1.0'
devices:
  - did: 10
    name: A
    type: switch
    module: Кухня
    adapter_settings: { matter: true, alice: true }
    services:
      - sid: 1
        role: on_off
        binding: { state: /devices/r/controls/K1 }
  - did: 11
    name: B
    type: switch
    module: Кухня
    adapter_settings: { matter: false, alice: true }
    services:
      - sid: 1
        role: on_off
        binding: { state: /devices/r/controls/K2 }
`;

describe('ConfiguratorStore mixed adapter settings', () => {
  it('marks a module with different adapter settings on import and clears the mark on revert', () => {
    const store = new ConfiguratorStore();

    store.importConfig(mixedYaml);
    expect(store.mixed).toEqual({ 'module:Кухня': true });

    store.revert();
    expect(store.mixed).toEqual({});
  });

  it('brings the loaded mark back after revert and clears it after a successful save', async () => {
    stubBackend({ status: [status({ modified_at: 1 })], config: respond(mixedYaml) });
    const store = new ConfiguratorStore();
    await store.load();
    expect(store.mixed).toEqual({ 'module:Кухня': true });

    store.importConfig(yaml);
    expect(store.mixed).toEqual({});
    store.revert();
    expect(store.mixed).toEqual({ 'module:Кухня': true });

    stubBackend({ status: [status({ modified_at: 1 })] });
    await store.save(live, async () => true);
    expect(store.mixed).toEqual({});
  });
});

describe('ConfiguratorStore.load', () => {
  it('marks the backend unavailable and starts empty when the status request fails', async () => {
    stubBackend({ status: [new Error('offline')] });
    const store = new ConfiguratorStore();

    await store.load();

    expect(store.backendState).toBe('unavailable');
    expect(store.devices).toEqual([]);
    expect(store.isLoading).toBe(false);
  });

  it('starts empty without fetching the config when the controller has none', async () => {
    stubBackend({ status: [respond({ has_config: false })] });
    const store = new ConfiguratorStore();

    await store.load();

    expect(store.backendState).toBe('available');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('throws ConfigParseError with the file path when the saved config does not parse', async () => {
    stubBackend({ status: [status({ parses: false })] });

    await expect(new ConfiguratorStore().load()).rejects.toEqual(new ConfigParseError('/p.yaml'));
  });

  it('throws on an HTTP error of the config request', async () => {
    stubBackend({ status: [status()], config: respond('', false) });

    await expect(new ConfiguratorStore().load()).rejects.toThrow('500');
  });

  it('loads the saved config as the clean state', async () => {
    stubBackend({ status: [status({ modified_at: 1 })], config: respond(yaml) });
    const store = new ConfiguratorStore();

    await store.load();

    expect(store.devices[0].rows[0]).toMatchObject({ did: 10, type: 'switch', bind: { on_off: 'wb-gpio/A1_OUT' } });
    expect(store.raw).toHaveLength(1);
    expect(store.isDirty).toBe(false);
  });
});

describe('ConfiguratorStore.save', () => {
  const loaded = async (modifiedAt: number, routes: Parameters<typeof stubBackend>[0]) => {
    stubBackend({ status: [status({ modified_at: modifiedAt })], config: respond(yaml) });
    const store = new ConfiguratorStore();
    await store.load();
    return { store, posts: stubBackend(routes) };
  };

  it('posts without asking when the file on the controller has not changed since loading', async () => {
    const { store, posts } = await loaded(1, { status: [status({ modified_at: 1 }), status({ modified_at: 2 })] });
    store.updateRow(store.devices[0].rows[0], { name: 'Насос' });
    const confirm = vi.fn(async () => true);

    const built = await store.save(live, confirm);

    expect(confirm).not.toHaveBeenCalled();
    expect(posts[0]).toContain('name: Насос');
    expect(built.config.devices).toHaveLength(2);
    expect(store.isDirty).toBe(false);
  });

  it('asks before overwriting a file changed on the controller and posts nothing on refusal', async () => {
    const { store, posts } = await loaded(1, { status: [status({ modified_at: 5 })] });

    expect(await store.save(live, async () => false)).toBeNull();
    expect(posts).toEqual([]);
    expect(store.isSaving).toBe(false);
  });

  it('throws with the backend message when the config is rejected', async () => {
    const { store } = await loaded(1, { status: [status({ modified_at: 1 })], post: respond('bad schema', false) });

    await expect(store.save(live, async () => true)).rejects.toThrow('500 bad schema');
  });

  it('throws and posts nothing while device names conflict', async () => {
    const { store, posts } = await loaded(1, { status: [status({ modified_at: 1 })] });
    store.addDevice('Другое', [{ type: 'switch', name: 'K2', bind: { on_off: 'wb-gpio/A2_OUT' } }]);
    store.setName(store.devices[1], 'wb-gpio');

    await expect(store.save(live, async () => true)).rejects.toThrow();
    expect(posts).toEqual([]);
    expect(store.isSaving).toBe(false);
  });

  it('drops devices left without rows after saving', async () => {
    const { store } = await loaded(1, { status: [status({ modified_at: 1 })] });
    store.removeRow(store.devices[0], 10);

    await store.save(live, async () => true);

    expect(store.devices).toEqual([]);
    expect(store.isDirty).toBe(false);
  });
});

describe('ConfiguratorStore editing', () => {
  const relay = (key: string) => ({ type: 'switch', name: key, bind: { on_off: key } });

  it('gives new rows dids from 10 up, past imported, unparsed and removed ones', () => {
    const store = new ConfiguratorStore();
    expect(store.nextDid()).toBe(10);

    store.importConfig(yaml);
    store.removeRow(store.devices[0], 10);

    expect(store.nextDid()).toBe(31);
  });

  it('adds a device with consecutive dids and selects it', () => {
    const store = new ConfiguratorStore();

    const device = store.addDevice('WB-MR6C 1', [relay('wb-mr6c_1/K1'), relay('wb-mr6c_1/K2')]);

    expect(store.devices).toEqual([device]);
    expect(store.selected).toBe(device);
    expect(device.rows.map((row) => [row.did, row.group])).toEqual([[10, ''], [11, '']]);
    expect(store.isDirty).toBe(true);
  });

  it('puts added rows first with the group of the last filled row', () => {
    const store = new ConfiguratorStore();
    const device = store.addDevice('Щит', [relay('r/K1'), relay('r/K2')]);
    store.updateRow(device.rows[0], { group: 'Котельная' });

    store.addRows(device, [relay('r/K3'), relay('r/K4')]);

    expect(device.rows.map((row) => [row.did, row.name, row.group])).toEqual([
      [12, 'r/K3', 'Котельная'],
      [13, 'r/K4', 'Котельная'],
      [10, 'r/K1', 'Котельная'],
      [11, 'r/K2', ''],
    ]);
  });

  it('adding a device with a taken name gives the new card a numeric suffix and keeps the first card', () => {
    const store = new ConfiguratorStore();
    const first = store.addDevice('WB-MR6C 1', [relay('wb-mr6c_1/K1')]);

    store.addDevice('WB-MR6C 1', [relay('wb-mr6c_1/K2')]);
    const third = store.addDevice('WB-MR6C 1', [relay('wb-mr6c_1/K3')]);

    expect(store.devices.map((device) => device.name)).toEqual(['WB-MR6C 1', 'WB-MR6C 1 2', 'WB-MR6C 1 3']);
    expect(first.rows).toEqual([{ did: 10, group: '', ...relay('wb-mr6c_1/K1') }]);
    expect(store.selected).toBe(third);
    expect(store.nameConflicts.size).toBe(0);
  });

  it('marks both cards as conflicting when one is renamed to the name of the other, ignoring spaces only', () => {
    const store = new ConfiguratorStore();
    const first = store.addDevice('Кухня', [relay('r/K1')]);
    const second = store.addDevice('Зал', [relay('r/K2')]);

    store.setName(second, 'кухня');
    expect(store.nameConflicts.size).toBe(0);

    store.setName(second, ' Кухня ');
    expect(Array.from(store.nameConflicts)).toEqual([first.id, second.id]);

    store.setName(first, '');
    store.setName(second, 'own-10');
    expect(Array.from(store.nameConflicts)).toEqual([first.id, second.id]);
  });

  it('changes the row type keeping the binding on the primary role, the did and the group', () => {
    const store = new ConfiguratorStore();
    const device = store.addDevice('Щит', [
      { type: 'cover', name: 'Шторы', bind: { position: 'dimmer/Level', on_off: 'dimmer/K1' } },
      { type: 'number_sensor', name: 'Уровень', unit: 'V', bind: { number: 'msw/level', battery: 'msw/battery' } },
    ]);
    store.updateRow(device.rows[0], { group: 'Зал' });

    store.changeType(device.rows[0], 'light', 'brightness', 'Свет');
    store.changeType(device.rows[1], 'temperature_sensor', 'temperature', 'Температура');

    expect(device.rows).toEqual([
      { did: 10, group: 'Зал', type: 'light', name: 'Свет', bind: { brightness: 'dimmer/Level', on_off: 'dimmer/K1' } },
      {
        did: 11, group: '', type: 'temperature_sensor', name: 'Температура',
        bind: { temperature: 'msw/level', battery: 'msw/battery' },
      },
    ]);
  });

  it('drops roles the new type does not have', () => {
    const store = new ConfiguratorStore();
    const device = store.addDevice('Щит', [
      { type: 'button', name: 'Кнопка', bind: { press: 'b/a', battery: 'b/bat' } },
    ]);

    store.changeType(device.rows[0], 'switch', 'on_off', 'Кнопка');

    expect(device.rows[0].bind).toEqual({ on_off: 'b/a' });
  });

  it('removes a device and moves the selection to the first remaining one', () => {
    const store = new ConfiguratorStore();
    const first = store.addDevice('A', [relay('r/K1')]);
    const second = store.addDevice('B', [relay('r/K2')]);

    store.removeDevice(second.id);

    expect(store.devices).toEqual([first]);
    expect(store.selected).toBe(first);
  });

  it('counts usedKeys only by bindings and tracks binding and unbinding of roles', () => {
    const store = new ConfiguratorStore();
    store.addDevice('Щит', [{ type: 'light', name: 'Свет', bind: {} }]);
    const row = store.devices[0].rows[0];
    expect(store.usedKeys.size).toBe(0);

    store.bindRole(row, 'brightness', 'dimmer/Channel 1');
    store.bindRole(row, 'on_off', 'dimmer/K1');
    store.bindRole(row, 'on_off', null);

    expect(row.bind).toEqual({ brightness: 'dimmer/Channel 1' });
    expect(Array.from(store.usedKeys)).toEqual(['dimmer/Channel 1']);
  });

  it('renames a device and toggles its adapters', () => {
    const store = new ConfiguratorStore();
    const device = store.addDevice('A', [relay('r/K1')]);

    store.setName(device, 'Кухня');
    store.setAdapters(device, { alice: false });

    expect(device).toMatchObject({ name: 'Кухня', matter: true, alice: false });
  });
});

describe('ConfiguratorStore adapters registry', () => {
  it('takes the adapters from the backend status and keeps the defaults when the status has none', async () => {
    const store = new ConfiguratorStore();
    stubBackend({ status: [respond({ has_config: false })] });
    await store.load();
    expect(store.adapters.map(({ id, installed }) => [id, installed])).toEqual([['matter', true], ['alice', true]]);

    const adapters = [{ id: 'matter', package: 'wb-mqtt-matter-bridge', installed: false, active: false }];
    stubBackend({ status: [respond({ has_config: false, adapters })] });
    await store.load();
    expect(store.adapters).toEqual(adapters);
  });
});
