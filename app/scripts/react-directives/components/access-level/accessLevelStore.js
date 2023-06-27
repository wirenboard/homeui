'use strict';

import { makeObservable, observable } from 'mobx';

class AccessLevelStore {
  constructor(rolesFactory) {
    this.accessGranted = true;
    this.rolesFactory = rolesFactory;

    makeObservable(this, {
      accessGranted: observable,
    });
  }

  setRole(value) {
    this.accessGranted = this.rolesFactory.checkRights(value);
  }
}

export default AccessLevelStore;
