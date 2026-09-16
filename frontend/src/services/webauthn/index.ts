export {
  authenticateWithPasskey,
  canUseWebAuthn,
  deletePasskey,
  getPasskeys,
  getWebAuthnConfig,
  registerPasskey
} from './webauthn';
export type { PasskeyCredential, WebAuthnConfig } from './types';
