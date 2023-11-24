import { makeAutoObservable } from 'mobx';

class CloudStatusStore {
  constructor() {
    this.initialized = false;
    this.status = null;
    this.activationLink = null;

    makeAutoObservable(this, {}, { autoBind: true });
  }

  updateStatus(status) {
    this.initialized = true;
    this.status = status;
  }

  updateActivationLink(activationLink) {
    this.initialized = true;
    if (activationLink === 'unknown') {
      this.activationLink = null;
      return;
    }
    this.activationLink = activationLink;
  }
}

export default CloudStatusStore;
