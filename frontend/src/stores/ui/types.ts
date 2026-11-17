import type { FunctionComponent } from 'react';
import type { UserRole } from '@/stores/auth';

export interface MenuItemInstance {
  label: string;
  id?: string;
  url?: string;
  icon?: FunctionComponent<any>;
  isShow?: boolean;
  isExternal?: boolean;
  openInNewTab?: boolean;
  children?: MenuItemInstance[];
}

export interface CustomMenuItem {
  id: string;
  url?: string;
  title?: {
    ru?: string;
    en?: string;
  };
  // url points outside the SPA — open with a full-page nav, not a hash route.
  isExternal?: boolean;
  // Only honoured together with isExternal.
  openInNewTab?: boolean;
  // Minimal role to see the item; visibility only, not access control.
  requiredRole?: UserRole;
  children?: CustomMenuItem[];
}

export enum HttpsSetupPhase {
  // Deciding whether there is an HTTPS site to move to — normally a matter of milliseconds
  Checking = 'checking',
  // Waiting for a certificate to be issued for the device, which takes minutes
  IssuingCertificate = 'issuing-certificate',
  // Nothing left to wait for: we stay on this host, so the app can start
  Done = 'done',
}

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  System = 'system',
  Bootstrap = 'bootstrap',
}
