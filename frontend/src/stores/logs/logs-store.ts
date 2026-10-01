import { makeAutoObservable, runInAction } from 'mobx';
import { logsProxy, mqttClient } from '@/services';
import type { Boot, LoadLogsParams, Log } from './types';

export default class LogsStore {
  public logs: Log[] = [];
  public services: string[] = [];
  public boots: Boot[] = [];
  public isLoading = false;

  constructor() {
    makeAutoObservable(this);
  }

  async loadServicesAndBoots() {
    return mqttClient.whenReady()
      .then(() => logsProxy.List())
      .then((res) => {
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
    return mqttClient.whenReady()
      .then(() => logsProxy.Load({ ...params, limit: 50 }))
      .then((logs: (Log | undefined)[]) => {
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
    await logsProxy.CancelLoad();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  clearLogs() {
    this.logs = [];
  }
}
