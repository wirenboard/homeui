import { runInAction, makeObservable, observable } from 'mobx';
import { type ErrorInfo } from '@/layouts/page';
import { daliProxy, mqttClient } from '@/services';
import { formatError } from '@/utils/format-error';
import { BusStore } from './bus-store';
import { DeviceStore } from './device-store';
import { GatewayStore } from './gateway-store';

export class DaliStore {
  public gateways: GatewayStore[] = [];
  public isLoading = true;
  public errors: ErrorInfo[];

  constructor() {
    makeObservable(this, {
      isLoading: observable,
      errors: observable,
      gateways: observable.shallow,
    });
  }

  async load() {
    try {
      await mqttClient.whenConnected();
      const gateways = await daliProxy.GetList();
      runInAction(() => {
        this.gateways = gateways.map((gateway) => {
          const gatewayStore = new GatewayStore(gateway.id, gateway.name);
          gatewayStore.children = gateway.buses.map((bus) => {
            const busStore = new BusStore(
              bus.id,
              bus.name,
              bus.commissioning,
            );
            busStore.children = bus.devices.map(
              (device) => new DeviceStore(device.id, device.name, device.groups ?? [], busStore),
            );
            busStore.syncGroupChildren();
            return busStore;
          });
          return gatewayStore;
        });
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
