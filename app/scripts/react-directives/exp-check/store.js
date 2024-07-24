import { makeObservable, observable, action } from 'mobx';

class ExpCheckStore {
  constructor() {
    this.result = null;
    this.details = [];
    this.timerHandler = null;

    makeObservable(this, { result: observable, details: observable, update: action });
  }

  update(result, details) {
    this.result = result;
    this.details = details || [];
    if (this.timerHandler !== null) {
      clearTimeout(this.timerHandler);
      this.timerHandler = null;
    }
    const TEN_MINUTES = 1000 * 60 * 10;
    const ONE_HOUR = 1000 * 60 * 60;
    this.timerHandler = setTimeout(
      () => fetch('/api/check'),
      result === 'found' ? TEN_MINUTES : ONE_HOUR
    );
  }
}

export default ExpCheckStore;
