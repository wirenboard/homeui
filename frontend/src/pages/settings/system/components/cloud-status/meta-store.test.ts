import { CloudStatusMetaStore } from './meta-store';
import { ConnectionStatus } from './store';

const { mqtt } = vi.hoisted(() => ({
  mqtt: {
    callbacks: {} as Record<string, (msg: { payload: string }) => void>,
    sent: [] as any[],
    whenConnected: () => Promise.resolve(),
    getID: () => 'wb-mqtt-homeui-test',
    addStickySubscription(topic: string, callback: (msg: { payload: string }) => void) {
      this.callbacks[topic] = callback;
    },
    send(...args: any[]) {
      this.sent.push(args);
    },
  },
}));

vi.mock('@/services', () => ({ mqttClient: mqtt }));

const STATUS_TOPIC = '/devices/system__wb-cloud-agent__wirenboard.cloud/controls/status';
const PROBE_TOPIC = '/tmp/wb-mqtt-homeui-test/cloud-status/wirenboard.cloud';

async function storeForProvider(name: string) {
  const metaStore = new CloudStatusMetaStore();
  await Promise.resolve();
  mqtt.callbacks['/wb-cloud-agent/providers']({ payload: name });
  await Promise.resolve();
  return metaStore.stores[name];
}

beforeEach(() => {
  mqtt.callbacks = {};
  mqtt.sent = [];
});

describe('CloudStatusMetaStore probing for a stopped agent', () => {
  test('after subscribing to a provider it sends itself a non-retained probe', async () => {
    await storeForProvider('wirenboard.cloud');

    expect(mqtt.sent).toEqual([[PROBE_TOPIC, '', false, 1]]);
    expect(mqtt.callbacks[PROBE_TOPIC]).toBeDefined();
  });

  test('the probe arriving before any status means the agent is not running: the card shows stopped', async () => {
    const store = await storeForProvider('wirenboard.cloud');

    mqtt.callbacks[PROBE_TOPIC]({ payload: '' });

    expect(store.initialized).toBe(true);
    expect(store.status).toBe(ConnectionStatus.Stopped);
  });

  test('a retained status delivered before the probe is left alone', async () => {
    const store = await storeForProvider('wirenboard.cloud');
    mqtt.callbacks[STATUS_TOPIC]({ payload: 'ok' });

    mqtt.callbacks[PROBE_TOPIC]({ payload: '' });

    expect(store.status).toBe(ConnectionStatus.Connected);
  });
});
