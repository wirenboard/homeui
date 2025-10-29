import { makeAutoObservable, runInAction } from 'mobx';
import type { Boot, LoadLogsParams, Log, LogsListFetch } from './types';

export default class LogsStore {
  public logs: Log[] = [];
  public services: string[] = [];
  public boots: Boot[] = [];
  public isLoading = false;

  #logsProxy: any;
  #whenMqttReady: () => Promise<void>;

  // eslint-disable-next-line typescript/naming-convention
  constructor(whenMqttReady: () => Promise<void>, LogsProxy: any) {
    this.#logsProxy = LogsProxy;
    this.#whenMqttReady = whenMqttReady;

    makeAutoObservable(this);
  }

  async loadServicesAndBoots() {
    return this.#whenMqttReady()
      .then(() => this.#logsProxy.List())
      .then((res: LogsListFetch) => {
        runInAction(() => {
          this.services = res.services;
          this.boots = res.boots;
        });
      });
  }

  async loadLogs(params: LoadLogsParams, isFilterChanged?: boolean) {
    // to avoid multiple loadings on filter change
    if (this.isLoading) {
      await this.cancelLoadLogs();
    }
    runInAction(() => {
      this.isLoading = true;
    });
    return this.#whenMqttReady()
      .then(() => this.#logsProxy.Load({ ...params, limit: 50 }))
      .then((logs: Log[]) => {
        return runInAction(() => {
          const reversedLogs = logs.reverse();

          if (isFilterChanged) {
            this.logs = reversedLogs;
            return !!logs.length;
          }

          if (params.cursor.direction === 'forward') {
            reversedLogs.shift();
            this.logs.push(...reversedLogs);
            return;
          } else {
            reversedLogs.pop();
            this.logs.unshift(...reversedLogs);
            return !!reversedLogs.length;
          }
        });
      })
      .finally(() => {
        runInAction(() => {
          this.isLoading = false;
        });
      });
  }

  async cancelLoadLogs() {
    await this.#logsProxy.CancelLoad();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
