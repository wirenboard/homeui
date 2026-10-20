export interface WebAuthnSettingsProps {
  onError: (error: string) => void;
  onDomainsChange?: (domains: string[]) => void;
}

export type DomainValidationError = 'empty' | 'ip';
