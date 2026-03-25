import { makeAutoObservable, runInAction } from 'mobx';
import { authStore } from '@/stores/auth';
import type { Dashboard } from '@/stores/dashboards';
import i18n from '~/i18n/react/config';
import { getMenu } from './api';
import { getMenuItems, mergeMenuItems, normalizeMenuResponse, toMenuItemInstance } from './menu-items';
import type { CustomMenuItem, MenuItemInstance } from './types';

interface PluginManifest {
  id: string;
  version: string;
  title: { ru: string; en: string };
  entrypoint: string;
  menu?: {
    parentId: string;
    item: {
      id: string;
      url: string;
      title?: { ru?: string; en?: string };
    };
  };
}

const getPlugins = async (): Promise<PluginManifest[]> => {
  try {
    const response = await fetch('/api/plugins');
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
};

export default class UiStore {
  public isConnected = false;
  public menuItems: MenuItemInstance[] = [];
  public modules: string[] = [];
  #additionalItems: CustomMenuItem[] = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setIsConnected(isConnected: boolean) {
    this.isConnected = isConnected;
  }

  async buildMenu(dashboards: Dashboard[], isShowWidgetsPage: boolean, params: URLSearchParams) {
    const { hasRights } = authStore;

    const commontems = getMenuItems(dashboards, isShowWidgetsPage, params, hasRights);
    const customItems = await this.#getCustomMenuItems();

    runInAction(() => {
      this.menuItems = mergeMenuItems(commontems, customItems);
    });
  }

  async #getCustomMenuItems() {
    if (!this.#additionalItems) {
      const [additionalItems, pluginManifests] = await Promise.all([getMenu(), getPlugins()]);
      this.#additionalItems = normalizeMenuResponse(additionalItems);

      // Store manifests for plugin directive to access
      (window as any).__HOMEUI_PLUGIN_MANIFESTS__ = pluginManifests;

      // Convert plugin menus to custom menu items
      for (const manifest of pluginManifests) {
        if (manifest.menu) {
          const pluginMenuItem: CustomMenuItem = {
            id: manifest.menu.parentId,
            children: [
              {
                id: manifest.menu.item.id,
                url: manifest.menu.item.url,
                title: manifest.menu.item.title || manifest.title,
              },
            ],
          };
          this.#additionalItems.push(pluginMenuItem);
        }
      }
    }
    runInAction(() => {
      this.modules = this.#collectModuleIds(this.#additionalItems);
    });
    return this.#additionalItems.map((item) => toMenuItemInstance(item, i18n.language));
  }

  #collectModuleIds(items: CustomMenuItem[]): string[] {
    const result: string[] = [];

    const walk = (item?: CustomMenuItem) => {
      if (!item?.children) {
        return;
      }

      item.children.forEach((child) => {
        if (child.id && !result.includes(child.id)) {
          result.push(child.id);
        }
        walk(child);
      });
    };

    items.forEach((item) => walk(item));

    return result;
  }
}
