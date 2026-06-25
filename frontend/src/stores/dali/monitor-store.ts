import { runInAction, makeAutoObservable } from 'mobx';
import { mqttClient } from '@/services';

export class MonitorStore {
  public logs: string[] = [];
  public isEnabled: boolean = false;
  public isOnPause: boolean = false;
  public filterValues: string[] = [];

  private topic: string = '';

  constructor() {
    makeAutoObservable(this);
  }

  enableMonitoring(busMqttId: string) {
    const topic = `/wb-dali/${busMqttId}/bus_monitor`;
    if (this.isEnabled && this.topic === topic) {
      return;
    }
    if (this.topic && this.topic !== topic) {
      this._unsubscribeFromTopic();
    }
    this.topic = topic;
    this.logs = [];
    this._subscribeToTopic();
    this.isEnabled = true;
    this.isOnPause = false;
  }

  disableMonitoring() {
    if (this.topic) {
      this._unsubscribeFromTopic();
      this.topic = '';
    }
    this.isEnabled = false;
    this.logs = [];
  }

  toggleLogsReception() {
    if (this.isEnabled) {
      this.isOnPause = !this.isOnPause;
      if (this.isOnPause) {
        this._unsubscribeFromTopic();
      } else {
        this._subscribeToTopic();
      }
    }
  }

  clearLogs() {
    this.logs = [];
  }

  setFilterValues(values: string[]) {
    this.filterValues = values;
  }

  _subscribeToTopic() {
    const MAX_MESSAGES = 500;
    mqttClient.addStickySubscription(this.topic, ({ payload }) => {
      runInAction(() => {
        if (this.logs.length === MAX_MESSAGES) {
          this.logs.shift();
        }
        this.logs.push(payload.trim());
      });
    });
  }

  _unsubscribeFromTopic() {
    mqttClient.unsubscribe(this.topic);
  }
}
