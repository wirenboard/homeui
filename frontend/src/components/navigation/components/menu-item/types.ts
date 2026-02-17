import { type MenuItemInstance } from '@/stores/ui';

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
