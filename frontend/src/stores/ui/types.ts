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
  // Open in a separate tab (only with isExternal); the tab is named after the
  // item id, so repeated clicks reuse it instead of spawning new ones.
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
  // Minimal role required to see this item; when absent the item is visible to
  // every role. The item is hidden unless the current role satisfies this rank
  // (hierarchical: admin >= operator >= user).
  requiredRole?: UserRole;
  children?: CustomMenuItem[];
}
