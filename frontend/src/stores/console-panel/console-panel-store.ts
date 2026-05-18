import { makeAutoObservable } from 'mobx';
import type { ConsoleTab } from './types';

export class ConsolePanelStore {
  public tabs: ConsoleTab[] = [];
  public activeTabId: string | null = null;
  public isVisible = false;
  public position: 'bottom' | 'right' = (localStorage.getItem('console-panel-position') as 'bottom' | 'right')
    || 'bottom';
  public height: string = localStorage.getItem('console-panel-height') || '220px';
  public width: string = localStorage.getItem('console-panel-width') || '300px';

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  registerTab(tab: ConsoleTab) {
    if (this.tabs.some((t) => t.id === tab.id)) {
      return;
    }
    this.tabs.push(tab);
    if (!this.activeTabId) {
      this.activeTabId = tab.id;
    }
  }

  unregisterTab(id: string) {
    this.tabs = this.tabs.filter((t) => t.id !== id);
    if (this.activeTabId === id) {
      this.activeTabId = this.tabs.length > 0 ? this.tabs[0].id : null;
    }
  }

  setActiveTab(id: string) {
    if (this.tabs.some((t) => t.id === id)) {
      this.activeTabId = id;
    }
  }

  show(tabId?: string) {
    this.isVisible = true;
    if (tabId) {
      this.setActiveTab(tabId);
    }
  }

  hide() {
    this.isVisible = false;
  }

  toggleVisibility() {
    this.isVisible = !this.isVisible;
  }

  setPosition(pos: 'bottom' | 'right') {
    this.position = pos;
    localStorage.setItem('console-panel-position', pos);
  }

  setHeight(h: string) {
    this.height = h;
    localStorage.setItem('console-panel-height', h);
  }

  setWidth(w: string) {
    this.width = w;
    localStorage.setItem('console-panel-width', w);
  }

  get activeTab(): ConsoleTab | undefined {
    return this.tabs.find((t) => t.id === this.activeTabId);
  }
}
