import { makeAutoObservable } from 'mobx';
import type { ConsoleTab } from './types';

const SESSION_VISIBLE_KEY = 'console-panel-visible';
const SESSION_ACTIVE_TAB_KEY = 'console-panel-active-tab';

export class ConsolePanelStore {
  public tabs: ConsoleTab[] = [];
  public activeTabId: string | null = null;
  public isVisible = false;
  public position: 'bottom' | 'right' = (localStorage.getItem('console-panel-position') as 'bottom' | 'right')
    || 'bottom';
  public height: string = localStorage.getItem('console-panel-height') || '220px';
  public width: string = localStorage.getItem('console-panel-width') || '300px';

  constructor() {
    this.isVisible = sessionStorage.getItem(SESSION_VISIBLE_KEY) === 'true';
    makeAutoObservable(this, {}, { autoBind: true });

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (ev) => {
        if (ev.ctrlKey && ev.code === 'Backquote') {
          ev.preventDefault();
          this.toggleVisibility();
        }
      });
    }
  }

  registerTab(tab: ConsoleTab) {
    if (this.tabs.some((t) => t.id === tab.id)) {
      return;
    }
    this.tabs.push(tab);
    if (!this.activeTabId) {
      this.activeTabId = tab.id;
    }
    const storedTabId = sessionStorage.getItem(SESSION_ACTIVE_TAB_KEY);
    if (storedTabId && tab.id === storedTabId && this.activeTabId !== storedTabId) {
      this.activeTabId = storedTabId;
    }
  }

  unregisterTab(id: string, options?: { silent?: boolean }) {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) {
      return;
    }
    if (!options?.silent && tab.onClose) {
      try {
        tab.onClose();
      } catch (error) {
        console.error(`Console tab "${id}" onClose handler failed`, error);
      }
    }
    this.tabs = this.tabs.filter((t) => t.id !== id);
    if (this.activeTabId === id) {
      this.activeTabId = this.tabs.length > 0 ? this.tabs[0].id : null;
      sessionStorage.setItem(SESSION_ACTIVE_TAB_KEY, this.activeTabId ?? '');
    }
  }

  setActiveTab(id: string) {
    if (this.tabs.some((t) => t.id === id)) {
      this.activeTabId = id;
      sessionStorage.setItem(SESSION_ACTIVE_TAB_KEY, id);
    }
  }

  show(tabId?: string) {
    this.isVisible = true;
    sessionStorage.setItem(SESSION_VISIBLE_KEY, 'true');
    if (tabId) {
      this.setActiveTab(tabId);
    }
  }

  hide() {
    this.isVisible = false;
    sessionStorage.setItem(SESSION_VISIBLE_KEY, 'false');
  }

  toggleVisibility() {
    this.isVisible = !this.isVisible;
    sessionStorage.setItem(SESSION_VISIBLE_KEY, String(this.isVisible));
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
