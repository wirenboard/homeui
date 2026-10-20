export {
  authenticateWithPasskey,
  canUseWebAuthn,
  classifyWebAuthnError,
  deletePasskey,
  getPasskeys,
  getWebAuthnConfig,
  registerPasskey,
  setWebAuthnConfig
} from './webauthn';
export type {
  PasskeyCredential,
  WebAuthnConfig,
  WebAuthnErrorClassification
} from './types';
