vi.mock('@/stores/auth', () => ({
  authStore: {
    isAuthenticated: false,
    isAutologin: false,
    checkAuth: vi.fn(),
  },
}));
vi.mock('@/utils/request', () => ({
  ApiError: class extends Error {
    code: string;
    constructor(opts: any) {
      super(opts.message); this.code = opts.code;
    }
  },
  ErrorCode: { HTMLResponse: 'ERR_HTML_RESPONSE' },
}));

import { authStore } from '@/stores/auth';
import { authGuard } from './auth';

describe('authGuard', () => {
  const next = vi.fn(async () => 'passed');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('location', { hash: '' });
    (authStore as any).isAuthenticated = false;
    (authStore as any).isAutologin = false;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('passes through when authenticated', async () => {
    (authStore as any).isAuthenticated = true;
    const result = await authGuard({} as any, next);
    expect(result).toBe('passed');
    expect(next).toHaveBeenCalled();
  });

  test('passes through when autologin', async () => {
    (authStore as any).isAutologin = true;
    const result = await authGuard({} as any, next);
    expect(result).toBe('passed');
  });

  test('calls checkAuth and passes on success', async () => {
    (authStore.checkAuth as any).mockResolvedValue(undefined);
    await authGuard({} as any, next);
    expect(authStore.checkAuth).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  test('redirects on 401 error', async () => {
    (authStore.checkAuth as any).mockRejectedValue({ status: 401 });
    await expect(authGuard({} as any, next)).rejects.toEqual(
      expect.objectContaining({ status: 302 }),
    );
  });
});
