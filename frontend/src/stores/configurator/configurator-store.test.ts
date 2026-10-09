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

describe('ConfiguratorStore.load', () => {
  it('marks the backend unavailable and starts empty when the status request fails', async () => {
    stubBackend({ status: [new Error('offline')] });
    const store = new ConfiguratorStore();

    await store.load();

    expect(store.backendState).toBe('unavailable');
    expect(store.wbs).toEqual([]);
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

    expect(store.wbs[0].channels.A1_OUT).toMatchObject({ did: 10, type: 'switch', bind: { on_off: 'wb-gpio/A1_OUT' } });
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
    store.updateRow(store.wbs[0].channels.A1_OUT, { name: 'Насос' });
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

  it('drops devices left without channels after saving', async () => {
    const { store } = await loaded(1, { status: [status({ modified_at: 1 })] });
    store.toggleChannel(store.wbs[0], 'A1_OUT');

    await store.save(live, async () => true);

    expect(store.wbs).toEqual([]);
    expect(store.isDirty).toBe(false);
  });
});

describe('ConfiguratorStore editing', () => {
  it('gives new rows dids from 10 up, past imported, unparsed and unchecked ones', () => {
    const store = new ConfiguratorStore();
    expect(store.nextDid()).toBe(10);

    store.importConfig(yaml);
    store.toggleChannel(store.wbs[0], 'A1_OUT');

    expect(store.nextDid()).toBe(31);
  });

  it('restores an unchecked channel with its settings and gives a new one the last group', () => {
    const store = new ConfiguratorStore();
    store.addWb('wb-gpio', { A1_OUT: { type: 'switch', name: 'Насос', bind: { on_off: 'wb-gpio/A1_OUT' } } });
    const wb = store.wbs[0];
    store.updateRow(wb.channels.A1_OUT, { group: 'Котельная' });

    store.toggleChannel(wb, 'A1_OUT');
    expect(wb.channels.A1_OUT).toBeUndefined();
    store.toggleChannel(wb, 'A1_OUT');
    store.toggleChannel(wb, 'A2_OUT', { type: 'switch', name: 'A2', bind: { on_off: 'wb-gpio/A2_OUT' } });

    expect(wb.channels.A1_OUT).toMatchObject({ did: 10, name: 'Насос', group: 'Котельная' });
    expect(wb.channels.A2_OUT).toMatchObject({ did: 11, group: 'Котельная' });
  });

  it('binds and unbinds an extra role of a row', () => {
    const store = new ConfiguratorStore();
    store.addOwn('Щит', { type: 'light', name: 'Свет', bind: {} });
    const row = store.own[0].rows[0];

    store.bindRole(row, 'brightness', 'dimmer/Channel 1');
    store.bindRole(row, 'on_off', 'dimmer/K1');
    store.bindRole(row, 'on_off', null);

    expect(row.bind).toEqual({ brightness: 'dimmer/Channel 1' });
    expect(store.usedKeys.has('dimmer/Channel 1')).toBe(true);
  });
});
