import { action, makeObservable, observable, runInAction } from 'mobx';
import { BaseItemStore, ItemType } from './base-item-store';
import type { BusStore } from './bus-store';

export class GatewayStore extends BaseItemStore {
  readonly type = ItemType.Gateway;
  public children: BusStore[] = [];
  public websocketEnabled: boolean = false;
  public websocketPort: number | undefined = undefined;

  private isFirstLoad = true;

  constructor(daliProxy: any, id: string, name: string) {
    super(daliProxy, id, name);
    makeObservable(this, {
      isLoading: observable,
      error: observable,
      label: observable,
      children: observable.shallow,
      websocketEnabled: observable,
      websocketPort: observable,
      setWebsocketEnabled: action,
      setWebsocketPort: action,
      load: action,
      setError: action,
    });
  }

  async load() {
        if (!this.isFirstLoad) {
          return;
        }
        try {
          this.isLoading = true;
          const data = await this.daliProxy.GetGateway({ gatewayId: this.id });
          runInAction(() => {
            this.websocketEnabled = data.config.websocket_enabled ?? false;
            this.websocketPort = data.config.websocket_port;
            this.isFirstLoad = false;
            this.label = data.name || this.label;
          });
          this.setError(null);
        } catch (error) {
          this.setError(error);
        } finally {
          runInAction(() => {
            this.isLoading = false;
          });
        }
  }

  async setWebsocketEnabled(value: boolean) {
    const prev = this.websocketEnabled;
    this.websocketEnabled = value;
    try {
      await this.daliProxy.SetGateway({ gatewayId: this.id, config: { websocket_enabled: value } });
      this.setError(null);
    } catch (error) {
      runInAction(() => {
        this.websocketEnabled = prev;
      });
      console.error('Failed to load gateway data', error);
      this.setError(error);
    }
  }

  async setWebsocketPort(value: number | undefined) {
    try {
      await this.daliProxy.SetGateway({ gatewayId: this.id, config: { websocket_port: value } });
      runInAction(() => {
        this.websocketPort = value;
        this.setError(null);
      });
    } catch (error) {
      this.setError(error);
    }
  }

}
