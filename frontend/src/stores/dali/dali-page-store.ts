import { runInAction, makeObservable, observable } from 'mobx';
import { type ErrorInfo } from '@/layouts/page';
import { formatError } from '@/utils/format-error';
import { BusStore } from './bus-store';
import type { DaliGlobalStore } from './dali-global-store';
import { DeviceStore } from './device-store';
import { GatewayStore } from './gateway-store';

export class DaliPageStore {
  public gateways: GatewayStore[] = [];
  public isLoading = true;
  public errors: ErrorInfo[];

  private daliGlobalStore: DaliGlobalStore;

  constructor(daliGlobalStore: DaliGlobalStore) {
    this.daliGlobalStore = daliGlobalStore;
    makeObservable(this, {
      isLoading: observable,
      errors: observable,
      gateways: observable.shallow,
    });
  }

  async load() {
    try {
      const gateways = await this.daliGlobalStore.refresh();
      runInAction(() => {
        this.gateways = gateways.map((gateway) => {
          const gatewayStore = new GatewayStore(gateway.id, gateway.name);
          gatewayStore.children = gateway.buses.map((bus, idx) => {
            const busStore = new BusStore(
              bus.id,
              bus.name,
              idx + 1,
              gateway.name,
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
