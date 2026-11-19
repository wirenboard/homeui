// @vitest-environment happy-dom
import { authStore } from '@/stores/auth';
import { requestMock } from '@/test/mocks/request';
import { MockWebSocket } from '@/test/mocks/websocket';
import { registerTerminalTab } from './register-terminal-tab';
import { terminalStore } from './terminal-store';

vi.mock('@/utils/request', () => import('@/test/mocks/request'));

const SESSION_ID = 'a'.repeat(32);

vi.stubGlobal('WebSocket', MockWebSocket);
vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:8080' });

/** Connects and lets the server assign a session id. */
function openSession() {
  terminalStore.connect();
  MockWebSocket.last.simulateOpen();
  MockWebSocket.last.simulateMessage({ type: 'session', id: SESSION_ID });
}

// Both the user menu and the users settings page (after editing your own account) log out
// through `authStore.logout()`.
describe('logging out of homeui and the console session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    terminalStore.forgetSession();
    MockWebSocket.reset();
    requestMock.post.mockResolvedValue({});
    authStore.isAutologin = false;
    // Wires logout to the terminal store.
    registerTerminalTab();
  });

  test('logging out drops the connection of this tab and forgets the session id', async () => {
    openSession();
    expect(terminalStore.sessionId).toBe(SESSION_ID);

    await authStore.logout();

    expect(MockWebSocket.last.close).toHaveBeenCalled();
    expect(terminalStore.sessionId).toBeNull();
    expect(sessionStorage.getItem('terminal-session')).toBeNull();
  });

  test('the session is let go of even when logging out needs no request to the backend', async () => {
    authStore.isAutologin = true;
    openSession();

    await authStore.logout();

    expect(requestMock.post).not.toHaveBeenCalled();
    expect(terminalStore.sessionId).toBeNull();
  });
});
