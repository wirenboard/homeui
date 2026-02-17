import { makeAutoObservable, runInAction } from 'mobx';
import { authStore } from '@/stores/auth';
import type { Dashboard } from '@/stores/dashboards';
import i18n from '~/i18n/react/config';
import { getMenu } from './api';
import { getMenuItems, mergeMenuItems, normalizeMenuResponse, toMenuItemInstance } from './menu-items';
import type { CustomMenuItem, MenuItemInstance } from './types';

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

  async initMenu(
    dashboards: Dashboard[],
    params: URLSearchParams,
    computeUrlWithParams: (url: string) => string
  ) {
    const { hasRights } = authStore;

    const commontems = getMenuItems(dashboards, params, hasRights, computeUrlWithParams);
    const customItems = await this.#getCustomMenuItems();

    runInAction(() => {
      this.menuItems = mergeMenuItems(commontems, customItems);
    });
  }

  async #getCustomMenuItems() {
    if (!this.#additionalItems) {
      const additionalItems = await getMenu();
      this.#additionalItems = normalizeMenuResponse(additionalItems);
    }
    this.modules = this.#collectModuleIds(this.#additionalItems);
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
