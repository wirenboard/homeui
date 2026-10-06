import type { mqttClient as mqttClientType } from './mqtt-client';

// On every broker reconnect attempt the client re-checks the session and reloads
// the page when it is gone. The check must not mistake an unreachable controller
// (rebooting after a firmware update) for a lost session.
describe('MqttClient auth check on broker reconnect', () => {
  let mqttClient: typeof mqttClientType;
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;
  let authStoreMock: { checkAuth: ReturnType<typeof vi.fn>; isAuthenticated: boolean };
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    mockClient = { on: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), publish: vi.fn(), end: vi.fn() };
    authStoreMock = { checkAuth: vi.fn(() => Promise.resolve()), isAuthenticated: true };
    reload = vi.fn();

    vi.doMock('mqtt', () => ({ default: { connect: vi.fn(() => mockClient) } }));
    vi.doMock('@/stores/auth', () => ({ authStore: authStoreMock }));
    vi.doMock('@/stores/ui', () => ({ uiStore: { setIsConnected: vi.fn() } }));
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
    vi.stubGlobal('location', { reload });

    mqttClient = (await import('./mqtt-client')).mqttClient;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function triggerReconnectAttempt() {
    mqttClient.connect('http://localhost', 'test-id');
    const handler = mockClient.on.mock.calls.find(([e]: [string]) => e === 'reconnect')[1];
    handler();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  test('reloads the page when the session is rejected', async () => {
    authStoreMock.isAuthenticated = false;
    authStoreMock.checkAuth.mockRejectedValue({ status: 401 });

    await triggerReconnectAttempt();

    expect(mockClient.end).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
  });

  test('keeps the page when the controller is unreachable', async () => {
    // the request fails without any HTTP status, authStore drops the role meanwhile
    authStoreMock.isAuthenticated = false;
    authStoreMock.checkAuth.mockRejectedValue(new Error('Network Error'));

    await triggerReconnectAttempt();

    expect(mockClient.end).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  test('keeps the page when the check succeeds', async () => {
    await triggerReconnectAttempt();

    expect(reload).not.toHaveBeenCalled();
  });
});
