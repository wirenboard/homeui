import type { FunctionComponent } from 'react';
import type { UserRole } from '@/stores/auth';

export interface MenuItemInstance {
  label: string;
  id?: string;
  url?: string;
  icon?: FunctionComponent<any>;
  isShow?: boolean;
  // When true, `url` points outside the SPA (a reverse-proxied service) and must
  // be opened with a full-page navigation, not an in-app hash route.
  isExternal?: boolean;
  // When true (only meaningful together with isExternal), open the link in a
  // separate browser tab instead of navigating the current one. The tab is named
  // after the item id (not _blank), so repeated clicks reuse/focus the same tab
  // rather than spawning a new one each time.
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
