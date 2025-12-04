import { makeAutoObservable, runInAction } from 'mobx';
import { type ConfigListItem } from './types';

export default class ConfigsStore {
  public configs: ConfigListItem[] = [];

  #configEditorProxy: any;
  #whenMqttReady: () => Promise<void>;

  // eslint-disable-next-line typescript/naming-convention
  constructor(whenMqttReady: () => Promise<void>, ConfigEditorProxy: any) {
    this.#configEditorProxy = ConfigEditorProxy;
    this.#whenMqttReady = whenMqttReady;

    makeAutoObservable(this);
  }

  async getList() {
    return this.#whenMqttReady()
      .then(() => this.#configEditorProxy.List())
      .then((configs: ConfigListItem[]) => {
        runInAction(() => {
          this.configs = configs;
        });
      });
  }
}
