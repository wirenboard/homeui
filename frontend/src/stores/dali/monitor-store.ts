import { runInAction, makeAutoObservable } from 'mobx';


export class MonitorStore {
  public logs: string[] = [];
  public isEnabled: boolean = false;
  public isOnPause: boolean = false;

  private topic: string = "";

  #mqttClient: any;

  // eslint-disable-next-line typescript/naming-convention
  constructor(mqttClient) {
    this.#mqttClient = mqttClient;

    makeAutoObservable(this);
  }

  enableMonitoring(bus_mqtt_id: string) {
    this.logs = [];
    this.topic = `/wb-dali/${bus_mqtt_id}/bus_monitor`;
    this._subscribeToTopic();
    this.isEnabled = true;
    this.onPause = false;
  }

  disableMonitoring() {
    if (this.topic) {
      this._unsubscribeFromTopic();
      this.topic = "";
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

  _subscribeToTopic() {
    const MAX_MESSAGES = 500;
    this.#mqttClient.addStickySubscription(this.topic, ({ topic, payload }) => {
      runInAction(() => {
        if (this.logs.length === MAX_MESSAGES) {
          this.logs.shift();
        }
        this.logs.push(payload.trim());
      });
    });
  }

  _unsubscribeFromTopic() {
    this.#mqttClient.unsubscribe(this.topic);
  }
}
