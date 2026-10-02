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

  // A stopped agent clears its retained topics, which arrives here as empty payloads:
  // an empty status is "not running", an empty link is "no link", an empty URL is ignored.
  updateStatus(status: ConnectionStatus) {
    this.initialized = true;
    this.status = status || ConnectionStatus.Stopped;
  }

  updateActivationLink(activationLink: string) {
    this.initialized = true;
    this.activationLink = activationLink && activationLink !== 'unknown' ? activationLink : null;
  }

  updateCloudBaseUrl(cloudBaseUrl: string) {
    if (!cloudBaseUrl) {
      return;
    }
    this.cloudBaseUrl = cloudBaseUrl;
    this.recalcCloudLink();
  }

  updateSerialNum(sn: string) {
    this.serialNum = sn;
    this.recalcCloudLink();
  }

  recalcCloudLink() {
    this.cloudLink = this.serialNum && this.cloudBaseUrl ? `${this.cloudBaseUrl}/controllers/${this.serialNum}` : '';
  }
}
