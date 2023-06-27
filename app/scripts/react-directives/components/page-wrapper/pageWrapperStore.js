'use strict';

import { makeAutoObservable } from 'mobx';

class PageWrapperStore {
  constructor(title) {
    this.loading = true;
    this.error = '';
    this.title = title;

    makeAutoObservable(this);
  }

  setError(value) {
    this.error = value;
  }

  clearError() {
    this.error = '';
  }

  setLoading(value) {
    this.loading = value;
  }

  setTitle(value) {
    this.title = value;
  }
}

export default PageWrapperStore;
