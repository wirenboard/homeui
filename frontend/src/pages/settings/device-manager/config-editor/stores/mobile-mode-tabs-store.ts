import { action, makeObservable, observable } from 'mobx';

export class MobileModeTabsStore {
  public inMobileMode: boolean = false;
  public tabsPanelIsActive: boolean = true;
  public toMobileContent: () => void;
  public toTabs: () => void;

  constructor(toMobileContent: () => void, toTabs: () => void) {
    this.inMobileMode = false;
    this.tabsPanelIsActive = true;
    this.toMobileContent = toMobileContent;
    this.toTabs = toTabs;

    makeObservable(this, {
      inMobileMode: observable,
      tabsPanelIsActive: observable,
      showTabsPanel: action.bound,
      showContentPanel: action.bound,
      setMobileMode: action.bound,
      movedToTabsPanel: action,
      movedToContentPanel: action,
    });
  }

  showTabsPanel() {
    this.movedToTabsPanel();
    this.toTabs();
  }

  showContentPanel() {
    this.tabsPanelIsActive = false;
    this.toMobileContent();
  }

  movedToTabsPanel() {
    this.tabsPanelIsActive = true;
  }

  movedToContentPanel() {
    this.tabsPanelIsActive = false;
  }

  setMobileMode(value: boolean) {
    if (this.inMobileMode !== value) {
      this.inMobileMode = value;
      this.showTabsPanel();
    }
  }
}
