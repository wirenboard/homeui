'use strict';

import { makeObservable, observable, action } from 'mobx';

class CollapseButtonState {
  constructor(collapsed, onCollapseFn, onRestoreFn) {
    this.collapsed = collapsed;
    this.onCollapseFn = onCollapseFn;
    this.onRestoreFn = onRestoreFn;

    makeObservable(this, {
      collapsed: observable,
      setCollapsed: action,
    });
  }

  setCollapsed(value) {
    if (value) {
      this.onCollapseFn?.();
    } else {
      this.onRestoreFn?.();
    }
    this.collapsed = value;
  }
}

export default CollapseButtonState;
