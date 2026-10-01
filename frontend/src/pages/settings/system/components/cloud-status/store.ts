import { makeAutoObservable } from 'mobx';

export enum ConnectionStatus {
  Connected = 'ok',
  Starting = 'starting',
  Connecting = 'connecting',
  Stopped = 'stopped',
}

export default class CloudStatusStore {
  public provider = '';
  public cloudBaseUrl = '';
  public serialNum = '';
  public initialized = false;
  public status: ConnectionStatus = null;
  public activationLink = null;
  public cloudLink = '';

  constructor(provider: string) {
    this.provider = provider;

    makeAutoObservable(this, {}, { autoBind: true });
  }

  updateStatus(status: ConnectionStatus) {
    this.initialized = true;
    this.status = status;
  }

  updateActivationLink(activationLink: string) {
    this.initialized = true;
    if (activationLink === 'unknown') {
      this.activationLink = null;
      return;
    }
    this.activationLink = activationLink;
  }

  updateCloudBaseUrl(cloudBaseUrl: string) {
    this.cloudBaseUrl = cloudBaseUrl;
    this.recalcCloudLink();
  }

  updateSerialNum(sn: string) {
    this.serialNum = sn;
    this.recalcCloudLink();
  }

  recalcCloudLink() {
    this.cloudLink = this.serialNum ? `${this.cloudBaseUrl}/controllers/${this.serialNum}` : '';
  }
}
