import { makeAutoObservable } from 'mobx';

class ExpCheckStore {
  constructor() {
    this.result = null;
    this.details = null;
    makeAutoObservable(this, {}, { autoBind: true });
  }

  updateResult(result) {
    this.result = result;
  }

  updateDetails(details) {
    this.details = details;
  }
}

export default ExpCheckStore;
