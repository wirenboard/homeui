import { makeAutoObservable } from 'mobx';
import type { MqttClient } from '@/common/types';
import FactoryResetFitsState from './factory-reset';
import { registerFirmwareTab, showFirmwareTab } from './register-firmware-tab';

export class FirmwareUpdateStore {
  public expandRootfs = true;
  public isRootfsExpanded = false;
  public activeMode: 'update' | 'reset' | null = null;
  public isActive = false;
  public uploading = false;
  public running = false;
  public progressPercents = 0;
  public receivedFirstStatus = false;
  public logRows: string[] = [];
  public stateType = '';
  public stateMsg = '';
  public doneLabel = '';
  public isDone = false;
  public error = null;
  public _mqttStatusIsSet = false;
  public _timer = null;
  public factoryResetFitsState = new FactoryResetFitsState();

  constructor(mqttClient: MqttClient, whenMqttReady: () => Promise<any>) {
    whenMqttReady().then(() => {
      mqttClient.addStickySubscription('/firmware/status', ({ payload }) => {
        this.updateStatus(payload);
      });

      mqttClient.addStickySubscription('/firmware/log', ({ payload }) => {
        this.updateLog(payload);
      });

      mqttClient.addStickySubscription('/firmware/progress', ({ payload }) => {
        this.updateProgress(payload);
      });

      mqttClient.addStickySubscription('/firmware/fits/factoryreset/present', ({ payload }) => {
        this.factoryResetFitsState.setFactoryResetFitPresent(payload);
      });

      mqttClient.addStickySubscription('/firmware/fits/factoryreset/compatibility', ({ payload }) => {
        this.factoryResetFitsState.setFactoryResetFitCompatibility(payload);
      });

      mqttClient.addStickySubscription('/firmware/fits/factoryreset-original/present', ({ payload }) => {
        this.factoryResetFitsState.setFactoryResetOriginalFitPresent(payload);
      });

      mqttClient.addStickySubscription('/firmware/fits/factoryreset-original/compatibility', ({ payload }) => {
        this.factoryResetFitsState.setFactoryResetOriginalFitCompatibility(payload);
      });
    });

    makeAutoObservable(this, {}, { autoBind: true });
  }

  setExpandRootfs(value: boolean) {
    this.expandRootfs = value;
  }

  setIsRootfsAlreadyExpanded(value: boolean) {
    this.isRootfsExpanded = value;
  }

  addLogRow(row: string) {
    this.logRows.push(row);
  }

  clearLog() {
    this.logRows = [];
  }

  showState(type, msg) {
    if (this.progressPercents === 0) {
      this.progressPercents = 100;
    }
    this.stateType = type;
    this.stateMsg = msg;
  }

  showDoneButton(label = 'system.buttons.dismiss') {
    this.isDone = true;
    this.doneLabel = label;
    this._mqttStatusIsSet = false;
  }

  onDoneClick() {
    this.isActive = false;
    this.activeMode = null;
    this.isDone = false;
    this.running = false;
    this.uploading = false;
    this.logRows = [];
    this.error = null;
  }

  setTimeout(seconds: number, msg: string) {
    this.running = true;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._timer = setTimeout(() => {
      this._timer = null;
      this.showState('danger', msg);
      this.showDoneButton();
    }, seconds * 1000);
  }

  setProgressTimeout() {
    this.setTimeout(60, 'system.errors.stalled');
  }

  setRebootTimeout() {
    this.setTimeout(300, 'system.errors.reboot');
  }

  clearTimeouts() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  get canUpload() {
    return this.receivedFirstStatus && !this.running && !this.uploading;
  }

  get inProgress() {
    return this.isActive && (this.running || this.uploading);
  }

  onUploadStart() {
    this.isActive = true;
    this.clearLog();
    this.uploading = true;
    this.showState('info', 'system.states.uploading');
    this.progressPercents = 0;
    registerFirmwareTab(this);
  }

  onUploadProgress(event: any) {
    this.progressPercents = event.completed;
  }

  onUploadFinish() {
    this.uploading = false;
    this.running = true;
    this.setProgressTimeout();
    if (!this._mqttStatusIsSet) {
      this.showState('info', 'system.states.uploaded');
    }
  }

  onUploadError(event: any) {
    let message = event.uploadResponse.data;
    this.addLogRow('Upload error: ' + message);
    console.error('Upload error: ', message);
    if (!this._mqttStatusIsSet) {
      this.showState('danger', 'system.states.upload_error');
    }
    this.showDoneButton();
  }

  /*
   * After single-rootfs update scheme support,
   * wb-watch-update may send combined status in order to report errors
   * when homeui is not yet connected after controller reboot.
   *
   * A combined status is usually something like this:
   *
   *   ERROR my error description
   *   IDLE
   *
   * or
   *
   *   REBOOT
   *   IDLE
   *
   * A status like this will cause ERROR state on older homeui version,
   * but it's supposed to disappear after page reload because newer homeui
   * will be available at this moment (combined status comes only with newer homeui).
   *
   * Combined statuses should be published by wb-watch-update only. If install_update.sh
   * script writes such a status, it may not be handled properly by older homeui, and
   * newer version of homeui will not be available,
   * so update tool will be stuck in this state.
   */
  updateStatus(msgPayload: string) {
    let rows = msgPayload.trim().split('\n');
    for (let i = 0; i < rows.length; i++) {
      this.updateSingleStatus(rows[i]);
    }

    this.receivedFirstStatus = true;
  }

  _parseMessagePayload(msgPayload: string) {
    let p = msgPayload.indexOf(' ');
    let type = p < 0 ? msgPayload : msgPayload.substr(0, p);
    let payload = p < 0 ? msgPayload : msgPayload.substr(p + 1, msgPayload.length);
    return [type, payload];
  }

  _updateIdleStatus() {
    this._mqttStatusIsSet = false;
    if (this.receivedFirstStatus && this.running) {
      this.clearTimeouts();
      if (!this.error) {
        this.showState('success', 'system.states.complete');
      }
      this.showDoneButton('system.buttons.hide');
    }
  }

  _updateInfoStatus(payload: string) {
    this.showState('info', payload);
    this.setProgressTimeout();
  }

  _updateErrorStatus(payload: string) {
    const message = payload || 'system.errors.unknown';
    this.error = message;
    this.showState('danger', message);
    this.setProgressTimeout();
  }

  _updateRebootStatus() {
    this.showState('warning', 'system.states.reboot');
    this.setRebootTimeout();
  }

  updateSingleStatus(msgPayload: string) {
    let [type, payload] = this._parseMessagePayload(msgPayload);
    this._mqttStatusIsSet = true;

    if (type === 'IDLE') {
      this._updateIdleStatus();
    }

    if (this.receivedFirstStatus) {
      if (type === 'INFO') {
        this._updateInfoStatus(payload);
      } else if (type === 'ERROR') {
        this._updateErrorStatus(payload);
      } else if (type === 'REBOOT') {
        this._updateRebootStatus();
      }
    }
  }

  updateProgress(msgPayload: string) {
    this.progressPercents = parseInt(msgPayload);
    this.setProgressTimeout();
  }

  updateLog(msgPayload: string) {
    let rows = msgPayload.trim().split('\n');
    for (let i = 0; i < rows.length; i++) {
      this.logRows.push(rows[i]);
    }
    if (this.isActive) {
      showFirmwareTab();
    }
    if (this._mqttStatusIsSet) {
      this.setProgressTimeout();
    }
  }
}
