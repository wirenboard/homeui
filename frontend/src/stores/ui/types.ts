import type { FunctionComponent } from 'react';
import type { UserRole } from '@/stores/auth';

export interface MenuItemInstance {
  label: string;
  id?: string;
  url?: string;
  icon?: FunctionComponent<any>;
  isShow?: boolean;
  // url points outside the SPA — open with a full-page nav, not a hash route.
  isExternal?: boolean;
  // New tab (only with isExternal), named after the item id so clicks reuse it.
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
  isExternal?: boolean;
  // When true (with isExternal), the menu link opens in a new browser tab.
  openInNewTab?: boolean;
  // Minimal role to see the item (admin >= operator >= user); absent = visible to all.
  requiredRole?: UserRole;
  children?: CustomMenuItem[];
}
