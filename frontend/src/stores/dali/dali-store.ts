import { makeAutoObservable, runInAction } from 'mobx';
import type { BusDetailed, DeviceDetailed, GatewayDetailed, DaliProxy } from './types';
import { formatError } from '@/utils/formatError';
import { ErrorInfo } from '@/layouts/page';

export class GatewayStore {
  public data: GatewayDetailed | null = null;
  public isLoading = true;
  public label: string = '';
  public error: string | null = null;
  public children: BusStore[] = [];

  #daliProxy: any;

  readonly type: string = 'gateway';
  readonly id: string;

  constructor(daliProxy: any, id: string, name: string) {
    this.#daliProxy = daliProxy;
    this.id = id;
    this.label = name;

    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load() {
    if (this.data) {
      return;
    }
    try {
      this.data = await this.#daliProxy.GetGateway({ gatewayId: this.id });
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  setError(error: unknown) {
    this.error = formatError(error);
  }
}

export class BusStore {
  public data: BusDetailed | null = null;
  public label: string = '';
  public isLoading = true;
  public error: string | null = null;
  public children: DeviceStore[] = [];

  #daliProxy: any;

  readonly type: string = 'bus';
  readonly id: string;

  constructor(daliProxy: any, id: string, name: string = '') {
    this.#daliProxy = daliProxy;
    this.id = id;
    this.label = name;

    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load() {
    if (this.data) {
      return;
    }
    try {
      this.data = await this.#daliProxy.GetBus({ busId: this.id });
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async scan() {
    try {
      this.isLoading = true;
      const res = await this.#daliProxy.ScanBus({ busId: this.id });
      let devices =  [];
      res.devices.forEach((device) => {
        const deviceStore = new DeviceStore(this.#daliProxy, device.id, device.name);
        devices.push(deviceStore);
      });
      runInAction(() => {
        this.children = devices;
      });
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  setError(error: unknown) {
    this.error = formatError(error);
  }
}

export class DeviceStore {
  public data: DeviceDetailed | null = null;
  public label: string = '';
  public isLoading = true;
  public error: string | null = null;

  #daliProxy: any;

  readonly type: string = 'device';
  readonly id: string;

  constructor(daliProxy: any, id: string, name: string = '') {
    this.#daliProxy = daliProxy;
    this.id = id;
    this.label = name;

    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load() {
    if (this.data) {
      return;
    }
    try {
      this.data = await this.#daliProxy.GetDevice({ deviceId: this.id });
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  setError(error: unknown) {
    this.error = formatError(error);
  }
}

export class DaliStore {
  public gateways: GatewayStore[] = [];
  public isLoading = true;
  public errors: ErrorInfo[];
  #daliProxy: DaliProxy;
  #whenMqttReady: () => Promise<void>;

  constructor(whenMqttReady: () => Promise<void>, daliProxy: DaliProxy) {
    this.#daliProxy = daliProxy;
    this.#whenMqttReady = whenMqttReady;

    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load() {
    try {
      await this.#whenMqttReady();
      const gateways = await this.#daliProxy.GetList();
      gateways.forEach((gateway) => {
        const gatewayStore = new GatewayStore(this.#daliProxy, gateway.id, gateway.name);
        gateway.buses.forEach((bus) => {
          const busStore = new BusStore(this.#daliProxy, bus.id, bus.name);
          gatewayStore.children.push(busStore);
          bus.devices.forEach((device) => {
            const deviceStore = new DeviceStore(this.#daliProxy, device.id, device.name);
            busStore.children.push(deviceStore);
          });
        });
        this.gateways.push(gatewayStore);
      });
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  setError(error: unknown) {
    if (!error) {
      this.errors = [];
      return;
    }
    this.errors = [{ variant: 'danger', text: formatError(error) }];
  }
}
