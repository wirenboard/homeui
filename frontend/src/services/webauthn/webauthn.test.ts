// @vitest-environment happy-dom
import { AxiosError } from 'axios';
import { requestMock } from '@/test/mocks/request';
import {
  authenticateWithPasskey,
  classifyWebAuthnError,
  getPasskeys,
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

describe('classifyWebAuthnError', () => {
  test('classifies an InvalidStateError (authenticator holds an excluded credential) as already-registered', () => {
    expect(classifyWebAuthnError(new DOMException('exists', 'InvalidStateError'))).toBe('already-registered');
  });

  test('classifies an AbortError (platform refused, e.g. a duplicate on Firefox for Android) as device-refused', () => {
    expect(classifyWebAuthnError(new DOMException('aborted', 'AbortError'))).toBe('device-refused');
  });

  test('classifies a plain 401 from the server as unknown', () => {
    const error = new AxiosError('401', '401', undefined, undefined, { status: 401, data: '' } as any);
    expect(classifyWebAuthnError(error)).toBe('unknown');
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

  test('requests unscoped options, decodes the challenge and completes with the serialized assertion', async () => {
    requestMock.post.mockResolvedValueOnce({
      data: {
        challenge_id: 'ch-1',
        options: { publicKey: { challenge: CHALLENGE_B64URL } },
      },
    });
    (navigator.credentials.get as any).mockResolvedValue(makeCredential());
    requestMock.post.mockResolvedValueOnce({ data: { user_type: 'admin', user_id: '1' } });

    const result = await authenticateWithPasskey();

    expect(requestMock.post).toHaveBeenNthCalledWith(1, '/auth/webauthn/login/options');
    const callArgs = (navigator.credentials.get as any).mock.calls[0][0];
    expect([...new Uint8Array(callArgs.publicKey.challenge)]).toEqual(CHALLENGE_BYTES);
    expect(callArgs.publicKey.allowCredentials).toBeUndefined();
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
    (navigator.credentials.get as any).mockRejectedValue(new DOMException('denied', 'NotAllowedError'));

    await expect(authenticateWithPasskey()).rejects.toThrow('denied');
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
    (navigator.credentials.create as any).mockRejectedValue(new DOMException('denied', 'NotAllowedError'));

    await expect(registerPasskey('user-1', 'My key')).rejects.toThrow('denied');
    expect(requestMock.post).toHaveBeenCalledTimes(1);
  });
});

describe('getPasskeys', () => {
  test('percent-encodes the user id in the URL', async () => {
    requestMock.get.mockResolvedValue({ data: [] });

    await getPasskeys('user/1');

    expect(requestMock.get).toHaveBeenCalledWith('/auth/webauthn/users/user%2F1/credentials');
  });
});
