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
    console.log('cloudBaseUrl', cloudBaseUrl);
    this.recalcCloudLink();
    console.log('cloudLink', this.cloudLink);
  }

  updateSerialNum(sn) {
    this.serialNum = sn;
    console.log('serialNum', sn);
    this.recalcCloudLink();
    console.log('cloudLink', this.cloudLink);
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
