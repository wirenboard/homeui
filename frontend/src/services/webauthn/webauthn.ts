import { request } from '@/utils/request';
import type {
  CredentialCreationPublicKeyOptions,
  CredentialRequestPublicKeyOptions,
  PasskeyCredential,
  WebAuthnCeremony,
  WebAuthnConfig,
  WebAuthnLoginResult,
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
  allowCredentials: options.allowCredentials?.map((credential) => ({
    ...credential,
    id: decodeBase64Url(credential.id as unknown as string),
  })),
});

const serializeRegistration = (credential: PublicKeyCredential) => {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      attestationObject: encodeBase64Url(response.attestationObject),
      transports: response.getTransports?.() ?? [],
    },
  };
};

const serializeAuthentication = (credential: PublicKeyCredential) => {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      authenticatorData: encodeBase64Url(response.authenticatorData),
      signature: encodeBase64Url(response.signature),
      userHandle: response.userHandle ? encodeBase64Url(response.userHandle) : null,
    },
  };
};

export const canUseWebAuthn = () => window.isSecureContext && 'PublicKeyCredential' in window;

export const getWebAuthnConfig = async () => {
  const { data } = await request.get<WebAuthnConfig>('/auth/webauthn/config');
  return data;
};

export const authenticateWithPasskey = async (login: string): Promise<WebAuthnLoginResult> => {
  const { data: ceremony } = await request.post<WebAuthnCeremony>(
    '/auth/webauthn/login/options',
    { login },
  );
  const credential = await navigator.credentials.get({
    publicKey: prepareRequestOptions(
      ceremony.options.publicKey as CredentialRequestPublicKeyOptions,
    ),
  }) as PublicKeyCredential;
  if (!credential) {
    throw new Error('WebAuthn authentication cancelled');
  }
  const { data } = await request.post<WebAuthnLoginResult>(
    '/auth/webauthn/login/complete',
    {
      challenge_id: ceremony.challenge_id,
      response: serializeAuthentication(credential),
    },
  );
  return data;
};

export const getPasskeys = async () => {
  const { data } = await request.get<PasskeyCredential[]>('/auth/webauthn/credentials');
  return data;
};

export const registerPasskey = async (name: string) => {
  const { data: ceremony } = await request.post<WebAuthnCeremony>(
    '/auth/webauthn/register/options',
  );
  const credential = await navigator.credentials.create({
    publicKey: prepareCreationOptions(
      ceremony.options.publicKey as CredentialCreationPublicKeyOptions,
    ),
  }) as PublicKeyCredential;
  if (!credential) {
    throw new Error('WebAuthn registration cancelled');
  }
  const { data } = await request.post<PasskeyCredential>(
    '/auth/webauthn/register/complete',
    {
      challenge_id: ceremony.challenge_id,
      name,
      response: serializeRegistration(credential),
    },
  );
  return data;
};

export const deletePasskey = async (credentialId: string) => {
  await request.delete(`/auth/webauthn/credentials/${credentialId}`);
};
