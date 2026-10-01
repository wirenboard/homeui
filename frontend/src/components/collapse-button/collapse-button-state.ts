import { makeObservable, observable, action } from 'mobx';

export class CollapseButtonState {
  public collapsed: boolean;
  public onCollapseFn: () => void;
  public onRestoreFn: () => void;

  constructor(collapsed: boolean, onCollapseFn?: () => void, onRestoreFn?: () => void) {
    this.collapsed = collapsed;
    this.onCollapseFn = onCollapseFn;
    this.onRestoreFn = onRestoreFn;

    makeObservable(this, {
      collapsed: observable,
      setCollapsed: action,
    });
  }

  setCollapsed(value: boolean) {
    if (value) {
      this.onCollapseFn?.();
    } else {
      this.onRestoreFn?.();
    }
    this.collapsed = value;
  }
}
