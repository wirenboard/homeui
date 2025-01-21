'use strict';

import { makeObservable, observable, runInAction } from 'mobx';

class AccessLevelStore {
  constructor(rolesFactory) {
    this.accessGranted = false;
    this.rolesFactory = rolesFactory;

    makeObservable(this, {
      accessGranted: observable,
    });
  }

  setRole(value) {
    this.rolesFactory.asyncCheckRights(value, () => {
      runInAction(() => {
        this.accessGranted = true;
      });
    });
  }
}

export default AccessLevelStore;
