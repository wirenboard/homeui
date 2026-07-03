import type { createRpcProxy as createRpcProxyType } from './rpc';

describe('createRpcProxy', () => {
  let createRpcProxy: typeof createRpcProxyType;
  let mqttMock: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    vi.resetModules();
    mqttMock = {
      addStickySubscription: vi.fn(),
      send: vi.fn(),
      isConnected: vi.fn(() => true),
      getID: vi.fn(() => 'test-client'),
      timeout: vi.fn(() => ({ _cancel: vi.fn() })),
      cancel: vi.fn(),
    };
    vi.doMock('@/services', () => ({ mqttClient: mqttMock }));
    createRpcProxy = (await import('./rpc')).createRpcProxy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function getStickyHandler() {
    return mqttMock.addStickySubscription.mock.calls[0][1] as (msg: { topic: string; payload: string }) => void;
  }

  function getLastCallId(): number {
    const payload = JSON.parse(mqttMock.send.mock.calls.at(-1)[1]);
    return payload.id;
  }

  test('returns object with specified methods and hasMethod', () => {
    const proxy = createRpcProxy('svc', ['Foo', 'Bar']);
    expect(typeof proxy.Foo).toBe('function');
    expect(typeof proxy.Bar).toBe('function');
    expect(typeof proxy.hasMethod).toBe('function');
  });

  test('method sends MQTT RPC message with correct topic and payload', () => {
    const proxy = createRpcProxy('svc', ['Ping']);
    proxy.Ping({ msg: 'hello' });

    expect(mqttMock.send).toHaveBeenCalledOnce();
    const [topic, raw] = mqttMock.send.mock.calls[0];
    expect(topic).toBe('/rpc/v1/svc/Ping/test-client');
    const parsed = JSON.parse(raw);
    expect(parsed.params).toEqual({ msg: 'hello' });
    expect(typeof parsed.id).toBe('number');
  });

  test('method sends empty params when none provided', () => {
    const proxy = createRpcProxy('svc', ['NoArgs']);
    proxy.NoArgs();

    const parsed = JSON.parse(mqttMock.send.mock.calls[0][1]);
    expect(parsed.params).toEqual({});
  });

  test('method resolves on successful response', async () => {
    const proxy = createRpcProxy('svc', ['Get']);
    const promise = proxy.Get();
    const handler = getStickyHandler();
    const callId = getLastCallId();

    handler({
      topic: '/rpc/v1/svc/Get/test-client/reply',
      payload: JSON.stringify({ id: callId, result: { value: 42 } }),
    });

    await expect(promise).resolves.toEqual({ value: 42 });
  });

  test('method rejects on error response', async () => {
    const proxy = createRpcProxy('svc', ['Fail']);
    const promise = proxy.Fail();
    const handler = getStickyHandler();
    const callId = getLastCallId();

    handler({
      topic: '/rpc/v1/svc/Fail/test-client/reply',
      payload: JSON.stringify({ id: callId, error: { message: 'boom' } }),
    });

    await expect(promise).rejects.toEqual({ message: 'boom' });
  });

  test('method rejects when not connected', async () => {
    mqttMock.isConnected.mockReturnValue(false);
    const proxy = createRpcProxy('svc', ['Offline']);

    await expect(proxy.Offline()).rejects.toEqual(
      expect.objectContaining({ data: 'MqttConnectionError' }),
    );
  });

  test('method rejects when send throws', async () => {
    mqttMock.send.mockImplementation(() => {
      throw new Error('send failed');
    });
    const proxy = createRpcProxy('svc', ['SendFail']);

    await expect(proxy.SendFail()).rejects.toThrow('send failed');
  });

  test('method rejects on unexpected response topic', async () => {
    const proxy = createRpcProxy('svc', ['TopicMismatch']);
    const promise = proxy.TopicMismatch();
    const handler = getStickyHandler();
    const callId = getLastCallId();

    handler({
      topic: '/wrong/topic',
      payload: JSON.stringify({ id: callId, result: null }),
    });

    await expect(promise).rejects.toContain('unexpected response topic');
  });

  test('cancels timeout when response arrives', async () => {
    const proxy = createRpcProxy('svc', ['CancelTimeout']);
    const promise = proxy.CancelTimeout();
    const handler = getStickyHandler();
    const callId = getLastCallId();

    handler({
      topic: '/rpc/v1/svc/CancelTimeout/test-client/reply',
      payload: JSON.stringify({ id: callId, result: 'ok' }),
    });

    await promise;
    expect(mqttMock.cancel).toHaveBeenCalled();
  });

  test('method rejects on RPC timeout', async () => {
    let timeoutCb: () => void;
    mqttMock.timeout.mockImplementation((cb: () => void) => {
      timeoutCb = cb;
      return { _cancel: vi.fn() };
    });

    const proxy = createRpcProxy('svc', ['Slow']);
    const promise = proxy.Slow();
    timeoutCb!();

    await expect(promise).rejects.toEqual(
      expect.objectContaining({ data: 'MqttTimeoutError' }),
    );
  });

  test('ignores response with invalid JSON', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const proxy = createRpcProxy('svc', ['BadJson']);
    proxy.BadJson();
    getStickyHandler()({ topic: 'x', payload: '{broken' });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('cannot parse'), expect.anything());
  });

  test('ignores response without id field', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const proxy = createRpcProxy('svc', ['NoId']);
    proxy.NoId();
    getStickyHandler()({ topic: 'x', payload: JSON.stringify({ result: 1 }) });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('without id'), expect.anything());
  });

  test('ignores response with unknown id', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const proxy = createRpcProxy('svc', ['UnknownId']);
    proxy.UnknownId();
    getStickyHandler()({ topic: 'x', payload: JSON.stringify({ id: 999999 }) });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('unexpected id'), expect.anything());
  });

  describe('hasMethod', () => {
    test('resolves true when retained message arrives', async () => {
      const proxy = createRpcProxy('svc', ['Exists']);
      const promise = proxy.hasMethod('Exists');

      const call = mqttMock.addStickySubscription.mock.calls.find(
        ([topic]: [string]) => topic === '/rpc/v1/svc/Exists',
      );
      call[1]();

      await expect(promise).resolves.toBe(true);
    });

    test('resolves false on timeout', async () => {
      let timeoutCb: () => void;
      mqttMock.timeout.mockImplementation((cb: () => void) => {
        timeoutCb = cb;
        return { _cancel: vi.fn() };
      });

      const proxy = createRpcProxy('svc', ['Missing']);
      const promise = proxy.hasMethod('Missing');
      timeoutCb!();

      await expect(promise).resolves.toBe(false);
    });
  });

  describe('disconnection', () => {
    test('rejects inflight calls when connection drops', async () => {
      vi.useFakeTimers();

      const proxy = createRpcProxy('svc', ['InFlight']);
      const promise = proxy.InFlight();
      promise.catch(() => {});

      mqttMock.isConnected.mockReturnValue(false);
      await vi.advanceTimersByTimeAsync(200);

      await expect(promise).rejects.toEqual(
        expect.objectContaining({ data: 'MqttConnectionError' }),
      );

      vi.useRealTimers();
    });
  });
});
