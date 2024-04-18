import { makeAutoObservable } from 'mobx';
import CloudStatusStore from "./store";

class CloudStatusMetaStore {
  constructor(mqttClient, whenMqttReady) {
    this.mqttClient = mqttClient;
    this.whenMqttReady = whenMqttReady;
    this.stores = {};
    makeAutoObservable(this, {}, { autoBind: true });
  }

  instantiateStore(provider) {
    const store = new CloudStatusStore(provider);

    this.whenMqttReady().then(() => {

      this.mqttClient.addStickySubscription('/devices/system__wb-cloud-agent__' + provider + '/controls/status', msg => {
        store.updateStatus(msg.payload);
      });

      this.mqttClient.addStickySubscription(
        '/devices/system__wb-cloud-agent__' + provider + '/controls/activation_link',
        msg => {
          store.updateActivationLink(msg.payload);
        }
      );

      this.mqttClient.addStickySubscription('/devices/system/controls/Short SN', msg => {
        store.updateSerialNum(msg.payload);
      });

      this.mqttClient.addStickySubscription('/devices/system__wb-cloud-agent__' + provider + '/controls/cloud_base_url', msg => {
        store.updateCloudBaseUrl(msg.payload);
      });

    });

    return store;
  }

  updateProviderList(value) {
    const providers = value.split(',');
    this.stores = {};
    for (const provider of providers) {
      this.stores[provider] = this.instantiateStore(provider);
    }
  }

}

export default CloudStatusMetaStore;
