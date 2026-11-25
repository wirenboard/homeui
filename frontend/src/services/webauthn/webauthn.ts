import { isAxiosError } from 'axios';
import type { AuthResponse } from '@/stores/auth';
import { request } from '@/utils/request';
import type {
  CredentialCreationPublicKeyOptions,
  CredentialRequestPublicKeyOptions,
  PasskeyCredential,
  WebAuthnCeremony,
  WebAuthnConfig,
  WebAuthnErrorClassification,
} from './types';

const decodeBase64Url = (value: string): ArrayBuffer => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
};

const encodeBase64Url = (value: ArrayBuffer): string => {
  const binary = String.fromCharCode(...new Uint8Array(value));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const prepareCreationOptions = (
  options: CredentialCreationPublicKeyOptions,
): CredentialCreationPublicKeyOptions => ({
  ...options,
  challenge: decodeBase64Url(options.challenge as unknown as string),
  user: {
    ...options.user,
    id: decodeBase64Url(options.user.id as unknown as string),
  },
  excludeCredentials: options.excludeCredentials?.map((credential) => ({
    ...credential,
    id: decodeBase64Url(credential.id as unknown as string),
  })),
});

const prepareRequestOptions = (
  options: CredentialRequestPublicKeyOptions,
): CredentialRequestPublicKeyOptions => ({
  ...options,
  challenge: decodeBase64Url(options.challenge as unknown as string),
});

const serializeCredential = (credential: PublicKeyCredential, response: Record<string, unknown>) => ({
  id: credential.id,
  rawId: encodeBase64Url(credential.rawId),
  type: credential.type,
  authenticatorAttachment: credential.authenticatorAttachment,
  clientExtensionResults: credential.getClientExtensionResults(),
  response: {
    clientDataJSON: encodeBase64Url(credential.response.clientDataJSON),
    ...response,
  },
});

const serializeRegistration = (credential: PublicKeyCredential) => {
  const response = credential.response as AuthenticatorAttestationResponse;
  return serializeCredential(credential, {
    attestationObject: encodeBase64Url(response.attestationObject),
    transports: response.getTransports?.() ?? [],
  });
};

const serializeAuthentication = (credential: PublicKeyCredential) => {
  const response = credential.response as AuthenticatorAssertionResponse;
  return serializeCredential(credential, {
    authenticatorData: encodeBase64Url(response.authenticatorData),
    signature: encodeBase64Url(response.signature),
    userHandle: response.userHandle ? encodeBase64Url(response.userHandle) : null,
  });
};

export const canUseWebAuthn = () => window.isSecureContext && 'PublicKeyCredential' in window;

export const getWebAuthnConfig = async () => {
  const { data } = await request.get<WebAuthnConfig>('/auth/webauthn/config');
  return data;
};

// NotAllowedError: the user dismissed the prompt or no authenticator matched;
// SecurityError: the current host is neither the rp_id nor its subdomain;
// InvalidStateError: the authenticator already holds one of the excluded credentials;
// AbortError: we never abort, so the platform refused; Firefox for Android reports a duplicate this way.
export const classifyWebAuthnError = (error: unknown): WebAuthnErrorClassification => {
  if (isAxiosError(error) && error.response?.status === 401 && error.response.data === 'unknown-credential') {
    return 'unknown-credential';
  }
  const name = (error as { name?: string })?.name;
  if (name === 'NotAllowedError') {
    return 'cancelled';
  }
  if (name === 'SecurityError') {
    return 'unsupported-origin';
  }
  if (name === 'InvalidStateError') {
    return 'already-registered';
  }
  if (name === 'AbortError') {
    return 'device-refused';
  }
  return 'unknown';
};

export const authenticateWithPasskey = async () => {
  const { data: ceremony } = await request.post<WebAuthnCeremony>('/auth/webauthn/login/options');
  const credential = await navigator.credentials.get({
    publicKey: prepareRequestOptions(
      ceremony.options.publicKey as CredentialRequestPublicKeyOptions,
    ),
  }) as PublicKeyCredential;
  const { data } = await request.post<AuthResponse>(
    '/auth/webauthn/login/complete',
    {
      challenge_id: ceremony.challenge_id,
      response: serializeAuthentication(credential),
    },
  );
  return data;
};

export const getPasskeys = async (userId: string) => {
  const { data } = await request.get<PasskeyCredential[]>(
    `/auth/webauthn/users/${encodeURIComponent(userId)}/credentials`,
  );
  return data;
};

export const registerPasskey = async (userId: string, name: string) => {
  const { data: ceremony } = await request.post<WebAuthnCeremony>(
    `/auth/webauthn/users/${encodeURIComponent(userId)}/register/options`,
  );
  const credential = await navigator.credentials.create({
    publicKey: prepareCreationOptions(
      ceremony.options.publicKey as CredentialCreationPublicKeyOptions,
    ),
  }) as PublicKeyCredential;
  const { data } = await request.post<PasskeyCredential>(
    `/auth/webauthn/users/${encodeURIComponent(userId)}/register/complete`,
    {
      challenge_id: ceremony.challenge_id,
      name,
      response: serializeRegistration(credential),
    },
  );
  return data;
};

export const deletePasskey = async (userId: string, credentialId: string) => {
  await request.delete(
    `/auth/webauthn/users/${encodeURIComponent(userId)}/credentials/${encodeURIComponent(credentialId)}`,
  );
};
