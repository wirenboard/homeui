import { makeAutoObservable, runInAction } from 'mobx';
import i18n from '@/i18n/config';
import { authStore } from '@/stores/auth';
import type { Dashboard } from '@/stores/dashboards';
import { getMenu } from './api';
import { getMenuItems, mergeMenuItems, normalizeMenuResponse, toMenuItemInstance } from './menu-items';
import { type CustomMenuItem, type MenuItemInstance, Theme } from './types';

export default class UiStore {
  public isConnected = false;
  public isSettingUpHttps = true;
  public menuItems: MenuItemInstance[] = [];
  public theme: Theme = Object.values(Theme).includes(localStorage.getItem('theme') as Theme)
    ? localStorage.getItem('theme') as Theme
    : Theme.Light;
  public modules: string[] = [];
  public currentPageTitle: string = '';
  public showPageInTitle: boolean = localStorage.getItem('show-page-in-title') !== 'false';
  #additionalItems: CustomMenuItem[] = null;
  #systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.#applyResolvedTheme();
    this.#systemThemeQuery.addEventListener('change', () => {
      if (this.theme === Theme.System) {
        this.#applyResolvedTheme();
      }
    });
  }

  setIsConnected(isConnected: boolean) {
    runInAction(() => {
      this.isConnected = isConnected;
    });
  }

  async buildMenu(dashboards: Dashboard[], isShowWidgetsPage: boolean, params: URLSearchParams) {
    const { hasRights } = authStore;

    const commonItems = getMenuItems(dashboards, isShowWidgetsPage, params, hasRights);
    const customItems = await this.#getCustomMenuItems();

    runInAction(() => {
      this.menuItems = mergeMenuItems(commonItems, customItems);
    });
  }

  setTheme(theme: Theme) {
    localStorage.setItem('theme', theme);
    this.theme = theme;
    this.#applyResolvedTheme();
  }

  get resolvedTheme(): Theme {
    return this.theme === Theme.System
      ? (this.#systemThemeQuery.matches ? Theme.Dark : Theme.Light)
      : this.theme === Theme.Dark ? Theme.Dark : Theme.Light;
  }

  #applyResolvedTheme() {
    const theme = this.theme === Theme.System
      ? (this.#systemThemeQuery.matches ? Theme.Dark : Theme.Light)
      : this.theme;
    document.documentElement.setAttribute('data-theme', theme);
  }

  setCurrentPageTitle(title: string) {
    this.currentPageTitle = title;
  }

  setShowPageInTitle(value: boolean) {
    localStorage.setItem('show-page-in-title', value ? 'true' : 'false');
    this.showPageInTitle = value;
  }

  async #getCustomMenuItems() {
    if (!this.#additionalItems) {
      const additionalItems = await getMenu();
      this.#additionalItems = normalizeMenuResponse(additionalItems);
    }
    runInAction(() => {
      this.modules = this.#collectModuleIds(this.#additionalItems);
    });
    return this.#additionalItems.map((item) => toMenuItemInstance(item, i18n.language, authStore.hasRights));
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
