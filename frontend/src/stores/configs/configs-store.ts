import { makeAutoObservable, runInAction } from 'mobx';
import type { ConfigListItem, Config } from './types';

export default class ConfigsStore {
  public configs: ConfigListItem[] = [];
  public config: Config = null;
  public path: string = null;

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

  async getConfig(path: string) {
    return this.#whenMqttReady()
      .then(() => this.#configEditorProxy.Load({ path }))
      .then((config: Config) => {
        runInAction(() => {
          this.config = config;
          this.path = path;
        });
      });
  }

  async saveConfig() {
    return this.#configEditorProxy.Save({ path: this.config.configPath, content: this.config.content });
  }

  clearConfig() {
    runInAction(() => {
      this.config = null;
    });
  }

  setContent(content: any) {
    runInAction(() => {
      this.config.content = content;
    });
  }
}
