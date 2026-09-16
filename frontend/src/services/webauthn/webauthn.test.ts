// @vitest-environment happy-dom
import { requestMock } from '@/test/mocks/request';
import {
  authenticateWithPasskey,
  canUseWebAuthn,
  deletePasskey,
  getPasskeys,
  getWebAuthnConfig,
  registerPasskey,
} from './webauthn';

vi.mock('@/utils/request', () => import('@/test/mocks/request'));

// "AQID" <-> bytes [1, 2, 3]; base64url has no padding, unlike this all-alnum sample.
const CHALLENGE_B64URL = 'AQID';
const CHALLENGE_BYTES = [1, 2, 3];
const CREDENTIAL_ID_B64URL = 'AQID';

function makeCredential(overrides: Record<string, any> = {}) {
  return {
    id: 'cred-1',
    rawId: Uint8Array.from([9, 9, 9]).buffer,
    type: 'public-key',
    authenticatorAttachment: 'platform',
    getClientExtensionResults: () => ({}),
    response: {
      clientDataJSON: Uint8Array.from([1]).buffer,
      attestationObject: Uint8Array.from([2]).buffer,
      authenticatorData: Uint8Array.from([3]).buffer,
      signature: Uint8Array.from([4]).buffer,
      userHandle: Uint8Array.from([5]).buffer,
      getTransports: () => ['internal'],
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('canUseWebAuthn', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as any).PublicKeyCredential;
  });

  test('returns false when the page is not a secure context', () => {
    vi.stubGlobal('isSecureContext', false);
    (window as any).PublicKeyCredential = function PublicKeyCredential() {};

    expect(canUseWebAuthn()).toBe(false);
  });

  test('returns false when the browser has no PublicKeyCredential', () => {
    vi.stubGlobal('isSecureContext', true);

    expect(canUseWebAuthn()).toBe(false);
  });

  test('returns true when secure and PublicKeyCredential is available', () => {
    vi.stubGlobal('isSecureContext', true);
    (window as any).PublicKeyCredential = function PublicKeyCredential() {};

    expect(canUseWebAuthn()).toBe(true);
  });
});

describe('getWebAuthnConfig', () => {
  test('fetches and returns the backend config', async () => {
    requestMock.get.mockResolvedValue({ data: { enabled: true, rp_id: 'wb.example.com' } });

    const config = await getWebAuthnConfig();

    expect(requestMock.get).toHaveBeenCalledWith('/auth/webauthn/config');
    expect(config).toEqual({ enabled: true, rp_id: 'wb.example.com' });
  });
});

describe('authenticateWithPasskey', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      credentials: { get: vi.fn(), create: vi.fn() },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('requests options with no login and decodes the returned challenge', async () => {
    requestMock.post.mockResolvedValueOnce({
      data: {
        challenge_id: 'ch-1',
        options: { publicKey: { challenge: CHALLENGE_B64URL } },
      },
    });
    (navigator.credentials.get as any).mockResolvedValue(makeCredential());
    requestMock.post.mockResolvedValueOnce({ data: { user_type: 'admin', user_id: '1' } });

    await authenticateWithPasskey();

    expect(requestMock.post).toHaveBeenNthCalledWith(1, '/auth/webauthn/login/options');
    const callArgs = (navigator.credentials.get as any).mock.calls[0][0];
    expect([...new Uint8Array(callArgs.publicKey.challenge)]).toEqual(CHALLENGE_BYTES);
    expect(callArgs.publicKey.allowCredentials).toBeUndefined();
  });

  test('serializes the assertion and completes the ceremony', async () => {
    requestMock.post.mockResolvedValueOnce({
      data: {
        challenge_id: 'ch-1',
        options: { publicKey: { challenge: CHALLENGE_B64URL } },
      },
    });
    (navigator.credentials.get as any).mockResolvedValue(makeCredential());
    requestMock.post.mockResolvedValueOnce({ data: { user_type: 'admin', user_id: '1' } });

    const result = await authenticateWithPasskey();

    expect(requestMock.post).toHaveBeenNthCalledWith(2, '/auth/webauthn/login/complete', {
      challenge_id: 'ch-1',
      response: expect.objectContaining({
        id: 'cred-1',
        type: 'public-key',
        response: expect.objectContaining({
          clientDataJSON: expect.any(String),
          authenticatorData: expect.any(String),
          signature: expect.any(String),
          userHandle: expect.any(String),
        }),
      }),
    });
    expect(result).toEqual({ user_type: 'admin', user_id: '1' });
  });

  test('throws when the user cancels the platform prompt', async () => {
    requestMock.post.mockResolvedValueOnce({
      data: {
        challenge_id: 'ch-1',
        options: { publicKey: { challenge: CHALLENGE_B64URL } },
      },
    });
    (navigator.credentials.get as any).mockResolvedValue(null);

    await expect(authenticateWithPasskey()).rejects.toThrow('WebAuthn authentication cancelled');
    expect(requestMock.post).toHaveBeenCalledTimes(1);
  });
});

describe('registerPasskey', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      credentials: { get: vi.fn(), create: vi.fn() },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('decodes challenge/user id and completes registration', async () => {
    requestMock.post.mockResolvedValueOnce({
      data: {
        challenge_id: 'ch-2',
        options: {
          publicKey: {
            challenge: CHALLENGE_B64URL,
            user: { id: CREDENTIAL_ID_B64URL, name: 'admin', displayName: 'admin' },
          },
        },
      },
    });
    (navigator.credentials.create as any).mockResolvedValue(makeCredential());
    requestMock.post.mockResolvedValueOnce({ data: { id: 'cred-1', name: 'My key' } });

    const result = await registerPasskey('user-1', 'My key');

    const callArgs = (navigator.credentials.create as any).mock.calls[0][0];
    expect([...new Uint8Array(callArgs.publicKey.challenge)]).toEqual(CHALLENGE_BYTES);
    expect([...new Uint8Array(callArgs.publicKey.user.id)]).toEqual(CHALLENGE_BYTES);
    expect(requestMock.post).toHaveBeenNthCalledWith(1, '/auth/webauthn/users/user-1/register/options');
    expect(requestMock.post).toHaveBeenNthCalledWith(2, '/auth/webauthn/users/user-1/register/complete', {
      challenge_id: 'ch-2',
      name: 'My key',
      response: expect.objectContaining({ id: 'cred-1' }),
    });
    expect(result).toEqual({ id: 'cred-1', name: 'My key' });
  });

  test('throws when the user cancels registration', async () => {
    requestMock.post.mockResolvedValueOnce({
      data: {
        challenge_id: 'ch-2',
        options: { publicKey: { challenge: CHALLENGE_B64URL, user: { id: CREDENTIAL_ID_B64URL } } },
      },
    });
    (navigator.credentials.create as any).mockResolvedValue(null);

    await expect(registerPasskey('user-1', 'My key')).rejects.toThrow('WebAuthn registration cancelled');
    expect(requestMock.post).toHaveBeenCalledTimes(1);
  });
});

describe('getPasskeys', () => {
  test('fetches the given user\'s credentials', async () => {
    const credentials = [{ id: '1', name: 'Key', created_at: '2026-01-01' }];
    requestMock.get.mockResolvedValue({ data: credentials });

    const result = await getPasskeys('user-1');

    expect(requestMock.get).toHaveBeenCalledWith('/auth/webauthn/users/user-1/credentials');
    expect(result).toEqual(credentials);
  });

  test('percent-encodes the user id in the URL', async () => {
    requestMock.get.mockResolvedValue({ data: [] });

    await getPasskeys('user/1');

    expect(requestMock.get).toHaveBeenCalledWith('/auth/webauthn/users/user%2F1/credentials');
  });
});

describe('deletePasskey', () => {
  test('deletes the credential by id for the given user', async () => {
    requestMock.delete.mockResolvedValue({});

    await deletePasskey('user-1', 'cred-1');

    expect(requestMock.delete).toHaveBeenCalledWith('/auth/webauthn/users/user-1/credentials/cred-1');
  });
});
