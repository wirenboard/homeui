import { runInAction, makeAutoObservable } from 'mobx';
import { mqttClient } from '@/services';

export const MAX_MESSAGES = 2000;

/** Incoming lines land in the observable buffer at this rate, not per message. */
export const FLUSH_INTERVAL_MS = 100;

export class MonitorStore {
  public logs: string[] = [];
  /** Counts every line ever appended, so it keeps growing once the buffer is capped. Row keys and the auto-scroll rely on that. */
  public totalAppended: number = 0;
  public isEnabled: boolean = false;
  public isOnPause: boolean = false;
  public filterValues: string[] = [];

  private topic: string = '';
  /** Lines received since the last flush. Plain (non-observable) on purpose. */
  private _pending: string[] = [];
  private _flushTimer: ReturnType<typeof setTimeout> = null;

  constructor() {
    makeAutoObservable<MonitorStore, '_pending' | '_flushTimer'>(this, {
      _pending: false,
      _flushTimer: false,
    });
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
    this._dropPending();
    this.logs = [];
  }

  setFilterValues(values: string[]) {
    this.filterValues = values;
  }

  _subscribeToTopic() {
    mqttClient.addStickySubscription(this.topic, ({ payload }) => {
      this._pending.push(payload.trim());
      if (this._flushTimer === null) {
        this._flushTimer = setTimeout(() => this._flush(), FLUSH_INTERVAL_MS);
      }
    });
  }

  _unsubscribeFromTopic() {
    this._dropPending();
    mqttClient.unsubscribe(this.topic);
  }

  /** Moves the whole batch into the observable buffer in one action, so the console renders once. */
  private _flush() {
    this._flushTimer = null;
    const batch = this._pending.length > MAX_MESSAGES ? this._pending.slice(-MAX_MESSAGES) : this._pending;
    const appended = this._pending.length;
    this._pending = [];

    runInAction(() => {
      const overflow = this.logs.length + batch.length - MAX_MESSAGES;
      if (overflow > 0) {
        this.logs.splice(0, overflow);
      }
      this.logs.push(...batch);
      this.totalAppended += appended;
    });
  }

  private _dropPending() {
    if (this._flushTimer !== null) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    this._pending = [];
  }
}
