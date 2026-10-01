import { makeAutoObservable, runInAction } from 'mobx';
import { mqttClient } from '@/services';
import CloudStatusStore, { type ConnectionStatus } from './store';

export class CloudStatusMetaStore {
  public stores = {};

  constructor() {
    mqttClient.whenConnected().then(() => {
      mqttClient.addStickySubscription('/wb-cloud-agent/providers', ({ payload }) => {
        this.updateProviderList(payload);
      });
    });

    makeAutoObservable(this, {}, { autoBind: true });
  }

  instantiateStore(provider: string) {
    const store = new CloudStatusStore(provider);

    mqttClient.whenConnected().then(() => {
      mqttClient.addStickySubscription(
        `/devices/system__wb-cloud-agent__${provider}/controls/status`,
        ({ payload }) => store.updateStatus(payload as ConnectionStatus),
      );

      mqttClient.addStickySubscription(
        `/devices/system__wb-cloud-agent__${provider}/controls/activation_link`,
        ({ payload }) => store.updateActivationLink(payload),
      );

      mqttClient.addStickySubscription(
        '/devices/system/controls/Short SN',
        ({ payload }) => store.updateSerialNum(payload),
      );

      mqttClient.addStickySubscription(
        `/devices/system__wb-cloud-agent__${provider}/controls/cloud_base_url`,
        ({ payload }) => store.updateCloudBaseUrl(payload),
      );
    });

    return store;
  }

  updateProviderList(value: string) {
    const providers = value.split(',');

    runInAction(() => {
      this.stores = {};
      for (const provider of providers) {
        this.stores[provider] = this.instantiateStore(provider);
      }
    });
  }
}
