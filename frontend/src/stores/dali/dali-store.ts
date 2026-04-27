import { runInAction, makeObservable, observable } from 'mobx';
import { type ErrorInfo } from '@/layouts/page';
import { formatError } from '@/utils/formatError';
import { BusStore } from './bus-store';
import { DeviceStore } from './device-store';
import { GatewayStore } from './gateway-store';
import type { DaliProxy } from './types';

export class DaliStore {
  public gateways: GatewayStore[] = [];
  public isLoading = true;
  public errors: ErrorInfo[];
  #daliProxy: DaliProxy;
  #whenMqttReady: () => Promise<void>;
  #mqttClient: any;

  constructor(whenMqttReady: () => Promise<void>, daliProxy: DaliProxy, mqttClient: any) {
    this.#daliProxy = daliProxy;
    this.#whenMqttReady = whenMqttReady;
    this.#mqttClient = mqttClient;

    makeObservable(this, {
      isLoading: observable,
      errors: observable,
    });
  }

  async load() {
    try {
      await this.#whenMqttReady();
      const gateways = await this.#daliProxy.GetList();
      const nextGateways: GatewayStore[] = [];
      gateways.forEach((gateway) => {
        const gatewayStore = new GatewayStore(this.#daliProxy, gateway.id, gateway.name);
        gateway.buses.forEach((bus) => {
          const busStore = new BusStore(
            this.#daliProxy,
            bus.id,
            bus.name,
            this.#mqttClient,
            bus.commissioning,
          );
          bus.devices.forEach((device) => {
            const deviceStore = new DeviceStore(this.#daliProxy, device.id, device.name, device.groups ?? [], busStore);
            busStore.children.push(deviceStore);
          });
          busStore.syncGroupChildren();
          gatewayStore.children.push(busStore);
        });
        nextGateways.push(gatewayStore);
      });
      runInAction(() => {
        this.gateways = nextGateways;
      });
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  destroy() {
    this.gateways.forEach((gateway) => {
      gateway.children.forEach((bus) => {
        bus.destroy();
      });
    });
  }

  setError(error: unknown) {
    if (!error) {
      this.errors = [];
      return;
    }
    this.errors = [{ variant: 'danger', text: formatError(error) }];
  }
}
