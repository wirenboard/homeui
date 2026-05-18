import { makeAutoObservable } from 'mobx';
import { ScanState } from './scan-page-store';

export class ScanningProgressStore {
  public actualState = ScanState.NotSpecified;
  public requiredState = ScanState.NotSpecified;
  public progress = 0;
  public scanningPorts = [];
  public isExtendedScanning = false;

  constructor() {
    makeAutoObservable(this);
  }

  setStateFromMqtt(isScanning: boolean, scanProgress: number, scanningPorts: string[], isExtendedScanning: boolean) {
    this.actualState = isScanning ? ScanState.Started : ScanState.Stopped;
    this.progress = scanProgress;
    this.scanningPorts = scanningPorts;
    this.isExtendedScanning = isExtendedScanning;

    if (this.actualState === this.requiredState) {
      this.requiredState = ScanState.NotSpecified;
    }
  }

  startScan() {
    this.requiredState = ScanState.Started;
    if (this.actualState === ScanState.Started) {
      return;
    }
    this.progress = 0;
  }

  scanStopped() {
    this.requiredState = ScanState.NotSpecified;
    this.actualState = ScanState.Stopped;
  }
}
