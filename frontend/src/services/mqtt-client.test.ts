import type { mqttClient as mqttClientType } from './mqtt-client';

vi.stubGlobal('localStorage', (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
})());

describe('MqttClient', () => {
  let mqttClient: typeof mqttClientType;
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;
  let mqttConnect: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    mockClient = {
      on: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      publish: vi.fn(),
      end: vi.fn(),
    };

    mqttConnect = vi.fn(() => mockClient);

    vi.doMock('mqtt', () => ({ default: { connect: mqttConnect } }));
    vi.doMock('@/stores/auth', () => ({
      authStore: { checkAuth: vi.fn(() => Promise.resolve()), isAuthenticated: true },
    }));
    vi.doMock('@/stores/ui', () => ({
      uiStore: { setIsConnected: vi.fn() },
    }));

    mqttClient = (await import('./mqtt-client')).mqttClient;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function triggerConnect() {
    mqttClient.connect('http://localhost', 'test-id');
    const handler = mockClient.on.mock.calls.find(([e]: [string]) => e === 'connect')[1];
    handler();
  }

  function triggerRetainHack() {
    const msgHandler = mockClient.on.mock.calls.find(([e]: [string]) => e === 'message')[1];
    msgHandler('/tmp/test-id/retain_hack', Buffer.from('1'), { qos: 2, retain: false });
  }

  function getMessageHandler() {
    return mockClient.on.mock.calls.find(([e]: [string]) => e === 'message')[1];
  }

  describe('connect', () => {
    test('creates mqtt connection with ws protocol', () => {
      mqttClient.connect('http://localhost:1883', 'my-client');
      expect(mqttConnect).toHaveBeenCalledWith(
        'ws://localhost:1883',
        expect.objectContaining({ clientId: 'my-client' }),
      );
    });

    test('converts https to wss', () => {
      mqttClient.connect('https://example.com', 'id');
      expect(mqttConnect).toHaveBeenCalledWith('wss://example.com', expect.anything());
    });

    test('passes auth credentials when provided', () => {
      mqttClient.connect('http://localhost', 'id', 'user', 'pass');
      expect(mqttConnect).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ username: 'user', password: 'pass' }),
      );
    });

    test('ends previous client on reconnect', () => {
      mqttClient.connect('http://localhost', 'id1');
      mqttClient.connect('http://localhost', 'id2');
      expect(mockClient.end).toHaveBeenCalledWith(true);
    });

    test('registers event handlers', () => {
      mqttClient.connect('http://localhost', 'id');
      const events = mockClient.on.mock.calls.map(([e]: [string]) => e);
      expect(events).toContain('connect');
      expect(events).toContain('message');
      expect(events).toContain('close');
      expect(events).toContain('reconnect');
    });
  });

  describe('isConnected', () => {
    test('returns false before connect', () => {
      expect(mqttClient.isConnected()).toBe(false);
    });

    test('returns true after connect event', () => {
      triggerConnect();
      expect(mqttClient.isConnected()).toBe(true);
    });

    test('returns false after close event', () => {
      triggerConnect();
      const closeHandler = mockClient.on.mock.calls.find(([e]: [string]) => e === 'close')[1];
      closeHandler();
      expect(mqttClient.isConnected()).toBe(false);
    });
  });

  describe('getID', () => {
    test('returns client ID set during connect', () => {
      mqttClient.connect('http://localhost', 'my-unique-id');
      expect(mqttClient.getID()).toBe('my-unique-id');
    });
  });

  describe('subscribe', () => {
    test('subscribes to topic and registers callback', () => {
      triggerConnect();
      const cb = vi.fn();
      mqttClient.subscribe('/test/topic', cb);
      expect(mockClient.subscribe).toHaveBeenCalledWith('/test/topic');
    });

    test('is no-op when disconnected', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mqttClient.subscribe('/test', vi.fn());
      expect(mockClient.subscribe).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('send', () => {
    test('publishes message with given params', () => {
      triggerConnect();
      mqttClient.send('/dest', 'payload', true, 2);
      expect(mockClient.publish).toHaveBeenCalledWith('/dest', 'payload', { qos: 2, retain: true });
    });

    test('defaults to qos 1 and retain true', () => {
      triggerConnect();
      mqttClient.send('/dest', 'data');
      expect(mockClient.publish).toHaveBeenCalledWith('/dest', 'data', { qos: 1, retain: true });
    });

    test('sends empty string for null payload', () => {
      triggerConnect();
      mqttClient.send('/dest', null);
      expect(mockClient.publish).toHaveBeenCalledWith('/dest', '', { qos: 1, retain: true });
    });

    test('is no-op when disconnected', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mqttClient.send('/dest', 'data');
      expect(mockClient.publish).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('message routing', () => {
    test('delivers to exact-match subscriber', () => {
      triggerConnect();
      const cb = vi.fn();
      mqttClient.subscribe('/devices/lamp/brightness', cb);

      getMessageHandler()('/devices/lamp/brightness', Buffer.from('100'), { qos: 0, retain: false });

      expect(cb).toHaveBeenCalledWith({
        topic: '/devices/lamp/brightness',
        payload: '100',
        qos: 0,
        retained: false,
      });
    });

    test('delivers to + wildcard subscriber', () => {
      triggerConnect();
      const cb = vi.fn();
      mqttClient.subscribe('/devices/+/controls/+', cb);

      getMessageHandler()('/devices/lamp/controls/brightness', Buffer.from('on'), { qos: 1, retain: true });

      expect(cb).toHaveBeenCalledWith(expect.objectContaining({
        topic: '/devices/lamp/controls/brightness',
        payload: 'on',
      }));
    });

    test('delivers to # wildcard subscriber', () => {
      triggerConnect();
      const cb = vi.fn();
      mqttClient.subscribe('/devices/#', cb);

      getMessageHandler()('/devices/lamp/controls/brightness', Buffer.from('x'), { qos: 0, retain: false });

      expect(cb).toHaveBeenCalled();
    });

    test('does not deliver to non-matching subscriber', () => {
      triggerConnect();
      const cb = vi.fn();
      mqttClient.subscribe('/other/topic', cb);

      getMessageHandler()('/devices/lamp', Buffer.from('x'), { qos: 0, retain: false });

      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('addStickySubscription', () => {
    test('subscribes immediately when connected', () => {
      triggerConnect();
      mqttClient.addStickySubscription('/sticky', vi.fn());
      expect(mockClient.subscribe).toHaveBeenCalledWith('/sticky');
    });

    test('re-subscribes on reconnect', () => {
      const cb = vi.fn();
      mqttClient.addStickySubscription('/sticky', cb);

      triggerConnect();
      expect(mockClient.subscribe).toHaveBeenCalledWith('/sticky');

      // Simulate disconnect
      const closeHandler = mockClient.on.mock.calls.find(([e]: [string]) => e === 'close')[1];
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      closeHandler();

      // Reconnect
      mockClient.subscribe.mockClear();
      mockClient.on.mockClear();
      mqttClient.connect('http://localhost', 'test-id-2');
      const newConnectHandler = mockClient.on.mock.calls.find(([e]: [string]) => e === 'connect')[1];
      newConnectHandler();

      expect(mockClient.subscribe).toHaveBeenCalledWith('/sticky');
    });
  });

  describe('unsubscribe', () => {
    test('removes callbacks and unsubscribes from broker', () => {
      triggerConnect();
      const cb = vi.fn();
      mqttClient.subscribe('/topic', cb);

      mqttClient.unsubscribe('/topic');

      expect(mockClient.unsubscribe).toHaveBeenCalledWith('/topic');

      getMessageHandler()('/topic', Buffer.from('data'), { qos: 0, retain: false });
      expect(cb).not.toHaveBeenCalled();
    });

    test('removes from sticky subscriptions', () => {
      const cb = vi.fn();
      mqttClient.addStickySubscription('/sticky-unsub', cb);
      mqttClient.unsubscribe('/sticky-unsub');

      // Reconnect — should NOT resubscribe removed topic
      mockClient.subscribe.mockClear();
      mockClient.on.mockClear();
      mqttClient.connect('http://localhost', 'test-id-3');
      const handler = mockClient.on.mock.calls.find(([e]: [string]) => e === 'connect')[1];
      handler();

      const subscribedTopics = mockClient.subscribe.mock.calls.map(([t]: [string]) => t);
      expect(subscribedTopics).not.toContain('/sticky-unsub');
    });
  });

  describe('disconnect', () => {
    test('resets state and ends client', () => {
      triggerConnect();
      mqttClient.disconnect();

      expect(mqttClient.isConnected()).toBe(false);
      expect(mockClient.end).toHaveBeenCalledWith(true);
    });
  });

  describe('whenConnected', () => {
    test('resolves immediately when already connected', async () => {
      triggerConnect();
      await expect(mqttClient.whenConnected()).resolves.toBeUndefined();
    });

    test('waits until connected', async () => {
      mqttClient.connect('http://localhost', 'test-id');
      let resolved = false;
      mqttClient.whenConnected().then(() => {
        resolved = true;
      });

      await Promise.resolve();
      expect(resolved).toBe(false);

      const connectHandler = mockClient.on.mock.calls.find(([e]: [string]) => e === 'connect')[1];
      connectHandler();
      await Promise.resolve();
      expect(resolved).toBe(true);
    });
  });

  describe('whenReady', () => {
    test('resolves after retain hack message arrives', async () => {
      triggerConnect();

      let resolved = false;
      mqttClient.whenReady().then(() => {
        resolved = true;
      });

      await Promise.resolve();

      triggerRetainHack();
      await Promise.resolve();
      expect(resolved).toBe(true);
    });
  });

  describe('timeout / cancel', () => {
    test('fires callback after delay once ready', async () => {
      vi.useFakeTimers();
      triggerConnect();
      triggerRetainHack();

      const cb = vi.fn();
      mqttClient.timeout(cb, 500);

      await vi.advanceTimersByTimeAsync(500);
      expect(cb).toHaveBeenCalledOnce();

      vi.useRealTimers();
    });

    test('cancel prevents callback', async () => {
      vi.useFakeTimers();
      triggerConnect();
      triggerRetainHack();

      const cb = vi.fn();
      const timer = mqttClient.timeout(cb, 500);
      mqttClient.cancel(timer);

      await vi.advanceTimersByTimeAsync(500);
      expect(cb).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    test('cancel is safe with undefined', () => {
      expect(() => mqttClient.cancel(undefined as any)).not.toThrow();
    });
  });

  describe('reconnect', () => {
    test('disconnects and connects with new client ID', () => {
      triggerConnect();
      mqttClient.reconnect('http://new-host', 'user', 'pass');

      expect(mockClient.end).toHaveBeenCalledWith(true);
      expect(mqttConnect).toHaveBeenCalledTimes(2);
      expect(mqttConnect.mock.calls[1][0]).toBe('ws://new-host');
      expect(mqttConnect.mock.calls[1][1]).toMatchObject({ username: 'user', password: 'pass' });
    });
  });
});
