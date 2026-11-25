export type CredentialCreationPublicKeyOptions = NonNullable<
  Parameters<typeof navigator.credentials.create>[0]
>['publicKey'];
export type CredentialRequestPublicKeyOptions = NonNullable<
  Parameters<typeof navigator.credentials.get>[0]
>['publicKey'];

export interface WebAuthnConfig {
  enabled: boolean;
  has_credentials: boolean;
}

export type WebAuthnErrorClassification =
  | 'cancelled'
  | 'unsupported-origin'
  | 'already-registered'
  | 'device-refused'
  | 'unknown-credential'
  | 'unknown';

export interface WebAuthnCeremony {
  challenge_id: string;
  options: {
    publicKey: CredentialCreationPublicKeyOptions | CredentialRequestPublicKeyOptions;
  };
}

export interface PasskeyCredential {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  last_used_at: string | null;
}
