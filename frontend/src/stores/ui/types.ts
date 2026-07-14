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
