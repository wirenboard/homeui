import { redirect } from 'react-router';
import { authStoreMock } from '@/test/mocks/auth-store';
import { ApiError, ErrorCode } from '@/test/mocks/request';
import { authGuard } from './auth';

vi.mock('react-router', () => ({
  redirect: vi.fn((url: string) => ({ __redirect: url })),
}));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/utils/request', () => import('@/test/mocks/request'));

describe('authGuard', () => {
  const next = vi.fn().mockResolvedValue('next');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('location', { hash: '' });
    authStoreMock.isAuthenticated = false;
    authStoreMock.isAutologin = false;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('allows authenticated users without calling checkAuth', async () => {
    authStoreMock.isAuthenticated = true;
    const result = await authGuard({} as any, next);
    expect(result).toBe('next');
    expect(authStoreMock.checkAuth).not.toHaveBeenCalled();
  });

  test('allows autologin users without calling checkAuth', async () => {
    authStoreMock.isAutologin = true;
    const result = await authGuard({} as any, next);
    expect(result).toBe('next');
    expect(authStoreMock.checkAuth).not.toHaveBeenCalled();
  });

  test('calls checkAuth and proceeds on success', async () => {
    authStoreMock.checkAuth.mockResolvedValue(undefined);
    const result = await authGuard({} as any, next);
    expect(authStoreMock.checkAuth).toHaveBeenCalled();
    expect(result).toBe('next');
  });

  test('redirects to /login without returnState when there is no hash', async () => {
    // Cold boot: hash is empty, so no returnState — it must NOT leak as the
    // literal string "undefined" into the URL.
    authStoreMock.checkAuth.mockRejectedValue({ status: 401 });
    await expect(authGuard({} as any, next)).rejects.toEqual({
      __redirect: '/login',
    });
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  test('redirects to /login carrying returnState from the hash', async () => {
    location.hash = '#/dashboards/1';
    authStoreMock.checkAuth.mockRejectedValue({ status: 401 });
    await expect(authGuard({} as any, next)).rejects.toEqual({
      __redirect: '/login?returnState=%2Fdashboards%2F1',
    });
    expect(redirect).toHaveBeenCalledWith('/login?returnState=%2Fdashboards%2F1');
  });

  test('logs error on HTML response without redirecting', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new ApiError({ message: 'html', code: ErrorCode.HTMLResponse });
    authStoreMock.checkAuth.mockRejectedValue(err);

    const result = await authGuard({} as any, next);
    expect(consoleSpy).toHaveBeenCalledWith('app.errors.nginx', err);
    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
    consoleSpy.mockRestore();
  });

  test('silently falls through on unknown errors', async () => {
    authStoreMock.checkAuth.mockRejectedValue(new Error('network'));
    const result = await authGuard({} as any, next);
    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
