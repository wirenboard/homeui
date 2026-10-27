export {
  authenticateWithPasskey,
  canUseWebAuthn,
  classifyWebAuthnError,
  deletePasskey,
  getPasskeys,
  getWebAuthnConfig,
  registerPasskey
} from './webauthn';
export type {
  PasskeyCredential,
  WebAuthnConfig,
  WebAuthnErrorClassification
} from './types';
