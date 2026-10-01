import { createRpcProxy } from './rpc';

const mqttMock = vi.hoisted(() => ({
  addStickySubscription: vi.fn(),
  send: vi.fn(),
  isConnected: vi.fn(() => true),
  getID: vi.fn(() => 'test-client'),
  timeout: vi.fn(() => ({})),
  cancel: vi.fn(),
}));
vi.mock('@/services', () => ({ mqttClient: mqttMock }));

describe('createRpcProxy reviver', () => {
  const reviver = vi.fn((key: string, value: unknown) => (key === 'value' ? 'revived' : value));
  const proxy = createRpcProxy('svc', [{ name: 'WithReviver', reviver }, 'Plain']);

  // Answers the last sent request with { value: 1 }
  const reply = () => {
    const [topic, payload] = mqttMock.send.mock.calls.at(-1);
    const handler = mqttMock.addStickySubscription.mock.calls.at(-1)[1];
    handler({ topic: `${topic}/reply`, payload: JSON.stringify({ id: JSON.parse(payload).id, result: { value: 1 } }) });
  };

  test('parses the reply with the method reviver', async () => {
    const promise = proxy.WithReviver();
    reply();

    await expect(promise).resolves.toEqual({ value: 'revived' });
    expect(reviver).toHaveBeenCalled();
  });

  test('a method without reviver parses the reply as usual', async () => {
    reviver.mockClear();
    const promise = proxy.Plain();
    reply();

    await expect(promise).resolves.toEqual({ value: 1 });
    expect(reviver).not.toHaveBeenCalled();
  });
});
