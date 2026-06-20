import type { FunctionComponent } from 'react';

export interface MenuItemInstance {
  label: string;
  id?: string;
  url?: string;
  icon?: FunctionComponent<any>;
  isShow?: boolean;
  // When true, `url` points outside the SPA (e.g. a reverse-proxied sub-app such
  // as /node-red/) and must be opened with a full-page navigation, not an
  // in-app hash route.
  isExternal?: boolean;
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
  children?: CustomMenuItem[];
}
