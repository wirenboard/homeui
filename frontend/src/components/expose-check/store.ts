import { makeObservable, observable, action } from 'mobx';
import { request } from '@/utils/request';
import { type CheckResult, type ExposeCheckStatus, type ExposeDetail } from './types';

export class ExposeCheckStore {
  public result: ExposeCheckStatus = null;
  public details: ExposeDetail[] = [];
  private _timerHandler: ReturnType<typeof setTimeout> = null;

  constructor(mqttClient: any, whenMqttReady: () => Promise<any>) {

    whenMqttReady().then(async () => {
      this.check();

      mqttClient.addStickySubscription('/rpc/v1/exp-check', (msg) => {
        try {
          let payload: CheckResult = JSON.parse(msg.payload);

          this.update(payload.result, payload.details);
        } catch (e) {}
      });
    });

    makeObservable(this, { result: observable, details: observable, update: action });
  }

  async check() {
    return request.get('/api/check').catch(() => {});
  }

  update(result: ExposeCheckStatus, details: ExposeDetail[]) {
    this.result = result;
    this.details = details || [];

    if (this._timerHandler !== null) {
      clearTimeout(this._timerHandler);
      this._timerHandler = null;
    }

    const TEN_MINUTES = 1000 * 60 * 10;
    const ONE_HOUR = 1000 * 60 * 60;

    this._timerHandler = setTimeout(
      () => this.check(),
      result === 'found' ? TEN_MINUTES : ONE_HOUR
    );
  }
}
