import { makeAutoObservable, runInAction } from 'mobx';
import CloudStatusStore from './store';

export class CloudStatusMetaStore {
  public stores = {};

  #mqttClient: any;
  #whenMqttReady: any;

  constructor(mqttClient: any, whenMqttReady: any) {
    this.#mqttClient = mqttClient;
    this.#whenMqttReady = whenMqttReady;

    this.#whenMqttReady().then(() => {
      this.#mqttClient.addStickySubscription('/wb-cloud-agent/providers', ({ payload }) => {
        this.updateProviderList(payload);
      });
    });

    makeAutoObservable(this, {}, { autoBind: true });
  }

  instantiateStore(provider: string) {
    const store = new CloudStatusStore(provider);

    this.#whenMqttReady().then(() => {
      this.#mqttClient.addStickySubscription(
        `/devices/system__wb-cloud-agent__${provider}/controls/status`,
        ({ payload }) => store.updateStatus(payload),
      );

      this.#mqttClient.addStickySubscription(
        `/devices/system__wb-cloud-agent__${provider}/controls/activation_link`,
        ({ payload }) => store.updateActivationLink(payload),
      );

      this.#mqttClient.addStickySubscription(
        '/devices/system/controls/Short SN',
        ({ payload }) => store.updateSerialNum(payload),
      );

      this.#mqttClient.addStickySubscription(
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
