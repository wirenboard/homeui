import type { PasskeyCredential } from '@/services/webauthn';

export interface PasskeysProps {
  userId: string;
}

export interface PasskeyRow {
  credential: PasskeyCredential;
  domain: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface PasskeysViewProps {
  rows: PasskeyRow[];
  onDelete: (credential: PasskeyCredential) => void;
}
