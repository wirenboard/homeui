import type { AuthResponse } from '@/stores/auth';

export type CredentialCreationPublicKeyOptions = NonNullable<
  Parameters<typeof navigator.credentials.create>[0]
>['publicKey'];
export type CredentialRequestPublicKeyOptions = NonNullable<
  Parameters<typeof navigator.credentials.get>[0]
>['publicKey'];

export interface WebAuthnConfig {
  enabled: boolean;
  rp_id?: string | null;
  origin?: string | null;
  /** Ordered: the first entry is the current relying-party domain, the rest are Related
   * Origin Request domains. Order is the only notion of "primary" — there is no separate flag. */
  domains?: string[];
  has_credentials?: boolean;
  https_ready?: boolean;
}

/**
 * Classification of a failed WebAuthn ceremony (`navigator.credentials.get()`/`create()`, or the
 * request layer around it), used to pick an accurate message instead of a blanket "failed" one:
 * - `cancelled` — the user dismissed the platform prompt, or no matching authenticator was found
 *   (`NotAllowedError`).
 * - `unsupported-origin` — the browser refused the ceremony because the current origin is neither
 *   the canonical `rp_id` nor a related origin it recognizes (`SecurityError`, typically).
 * - `unknown` — anything else (network error, server rejection, etc).
 */
export type WebAuthnErrorClassification = 'cancelled' | 'unsupported-origin' | 'unknown';

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

export type WebAuthnLoginResult = AuthResponse;
