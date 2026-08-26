import type { AuthResponse } from '@/stores/auth';

export type CredentialCreationPublicKeyOptions = NonNullable<
  Parameters<typeof navigator.credentials.create>[0]
>['publicKey'];
export type CredentialRequestPublicKeyOptions = NonNullable<
  Parameters<typeof navigator.credentials.get>[0]
>['publicKey'];

export interface WebAuthnConfig {
  enabled: boolean;
  rp_id?: string;
}

export interface WebAuthnCeremony {
  challenge_id: string;
  options: {
    publicKey: CredentialCreationPublicKeyOptions | CredentialRequestPublicKeyOptions;
  };
}

export interface PasskeyCredential {
  id: string;
  name: string;
  created_at: string;
  last_used_at?: string;
}

export interface WebAuthnLoginResult extends AuthResponse {}
