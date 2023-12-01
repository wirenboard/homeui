import {makeAutoObservable} from "mobx";

class FactoryResetFitsState {
  factoryresetFitPresent = false;
  factoryresetFitCompatibility = '';
  factoryresetOriginalFitPresent = false;
  factoryresetOriginalFitCompatibility = '';
  canDoFactoryReset = false;

  constructor() {
    makeAutoObservable(this);
  }

  setFactoryResetFitPresent(factoryresetFitPresent) {
    this.factoryresetFitPresent = factoryresetFitPresent === 'true';
    this.updateCanDoFactoryReset();
  }

  setFactoryResetFitCompatibility(factoryresetFitCompatibility) {
    this.factoryresetFitCompatibility = factoryresetFitCompatibility;
    this.updateCanDoFactoryReset();
  }

  setFactoryResetOriginalFitPresent(factoryresetOriginalFitPresent) {
    this.factoryresetOriginalFitPresent = factoryresetOriginalFitPresent === 'true';
    this.updateCanDoFactoryReset();
  }

  setFactoryResetOriginalFitCompatibility(factoryresetOriginalFitCompatibility) {
    this.factoryresetOriginalFitCompatibility = factoryresetOriginalFitCompatibility;
    this.updateCanDoFactoryReset();
  }

  updateCanDoFactoryReset() {
    if (!this.factoryresetFitPresent) {
      this.canDoFactoryReset = false;
    } else {
      this.canDoFactoryReset = this.factoryresetFitCompatibility.includes('+fit-factory-reset');
    }
  }
}

export default FactoryResetFitsState;
