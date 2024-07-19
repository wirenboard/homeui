import { makeObservable, observable } from 'mobx';

class ExpCheckStore {
  constructor() {
    this.result = null;
    this.details = [];
    this.timerHandler = null;

    makeObservable(this, { result: observable, details: observable });
  }

  update(result, details) {
    this.result = result;
    this.details = details || [];
    if (result === 'found') {
      if (this.timerHandler === null) {
        this.timerHandler = setInterval(() => fetch('/api/check'), 1000 * 60 * 10);
      }
    } else {
      if (this.timerHandler !== null) {
        clearInterval(this.timerHandler);
        this.timerHandler = null;
      }
    }
  }
}

export default ExpCheckStore;
