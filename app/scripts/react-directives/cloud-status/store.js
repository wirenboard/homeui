import { makeAutoObservable } from 'mobx';

class CloudStatusStore {
  constructor(provider) {
    this.provider = provider;
    this.cloudBaseUrl = '';
    this.serialNum = '';
    this.initialized = false;
    this.status = null;
    this.activationLink = null;
    this.cloudLink = '';

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

  updateCloudBaseUrl(cloudBaseUrl) {
    this.cloudBaseUrl = cloudBaseUrl;
    this.recalcCloudLink();
  }

  updateSerialNum(sn) {
    this.serialNum = sn;
    this.recalcCloudLink();
  }

  recalcCloudLink() {
    if (this.serialNum) {
      this.cloudLink = this.cloudBaseUrl + '/controllers/' + this.serialNum;
    } else {
      this.cloudLink = '';
    }
  }

}

export default CloudStatusStore;
