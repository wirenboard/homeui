import { type FunctionComponent } from 'react';

export interface MenuItemInstance {
  label: string;
  id?: string;
  url?: string;
  icon?: FunctionComponent<any>;
  isShow?: any;
  children?: MenuItemInstance[];
}

export interface MenuItemProps {
  item: MenuItemInstance;
  isMenuCompact: boolean;
  page?: string;
  id?: string;
  openedSubmenus: string[];
  setOpenedSubmenus: (_val: string[]) => void;
  activePopup: string;
  setActivePopup: (_val: string) => void;
  isChildren?: boolean;
  closeMobileMenu: () => void;
}
