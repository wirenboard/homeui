// rpcHasMethod edge cases: availability is cached per target AND method
// (the advertisement topic), a retained advertisement may be delivered
// synchronously at subscribe time, and a method appearing later (service
// upgraded or restarted while the page is open) must not stay
// "unavailable" for the session.
import type { createRpcProxy as createRpcProxyType } from './rpc';

describe('rpcHasMethod', () => {
  let createRpcProxy: typeof createRpcProxyType;
  let mqttMock: Record<string, ReturnType<typeof vi.fn>>;
  let timeoutCallbacks: (() => void)[];

  beforeEach(async () => {
    vi.resetModules();
    timeoutCallbacks = [];
    mqttMock = {
      addStickySubscription: vi.fn(),
      send: vi.fn(),
      isConnected: vi.fn(() => true),
      getID: vi.fn(() => 'test-client'),
      timeout: vi.fn((cb: () => void) => {
        timeoutCallbacks.push(cb);
        return { _cancel: vi.fn() };
      }),
      cancel: vi.fn(),
    };
    vi.doMock('@/services', () => ({ mqttClient: mqttMock }));
    createRpcProxy = (await import('./rpc')).createRpcProxy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function advertise(topic: string) {
    const call = mqttMock.addStickySubscription.mock.calls.find(([t]: [string]) => t === topic);
    call[1]({ topic, payload: '1' });
  }

  test('two targets sharing a method name are cached separately', async () => {
    const a = createRpcProxy('svc-a', ['Foo']);
    const b = createRpcProxy('svc-b', ['Foo']);
    const aHas = a.hasMethod('Foo');
    const bHas = b.hasMethod('Foo');
    // only svc-a advertises Foo; svc-b runs into its timeout
    advertise('/rpc/v1/svc-a/Foo');
    expect(timeoutCallbacks).toHaveLength(2);
    timeoutCallbacks[1]();
    await expect(aHas).resolves.toBe(true);
    await expect(bHas).resolves.toBe(false);
  });

  test('a retained advertisement delivered synchronously at subscribe answers with no timeout', async () => {
    // the broker may deliver the retained advertisement during subscribe,
    // before hasMethod has created its bookkeeping entry
    mqttMock.addStickySubscription.mockImplementation((topic: string, cb: (msg: any) => void) => {
      if (topic === '/rpc/v1/svc/Ready') cb({ topic, payload: '1' });
    });
    const proxy = createRpcProxy('svc', ['Ready']);
    await expect(proxy.hasMethod('Ready')).resolves.toBe(true);
    expect(mqttMock.timeout).not.toHaveBeenCalled();
  });

  test('a method advertised after the first ask timed out is available to the next ask', async () => {
    const proxy = createRpcProxy('svc', ['Late']);
    const first = proxy.hasMethod('Late');
    timeoutCallbacks[0]();
    await expect(first).resolves.toBe(false);
    // the service is upgraded/restarted while the page stays open
    advertise('/rpc/v1/svc/Late');
    await expect(proxy.hasMethod('Late')).resolves.toBe(true);
  });
});
