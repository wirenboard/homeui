import { makeAutoObservable } from 'mobx';
import DownloadBackupModalState from './modal';

class FirmwareUpdateStore {
  constructor() {
    this.destination = "/fwupdate/upload";
    this.accept = ".fit";
    this.expandRootfs = false;

    this.receivedFirstStatus = false;
    this.uploading = false;
    this.running = false;
    this.progressPercents = 0;
    this.logRows = [];
    this.stateType = "";
    this.stateMsg = "";
    this.doneLabel = "";
    this.isDone = false;
    this.error = null;
    this._mqttStatusIsSet = false;
    this._timer = null;

    this.modalState = new DownloadBackupModalState();

    makeAutoObservable(this, {}, { autoBind: true });
  }

  addLogRow(row) {
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

  showDoneButton(msg) {
    if (!msg) {
      msg = "system.buttons.dismiss";
    }

    this.isDone = true;
    this.doneLabel = msg;
    this._mqttStatusIsSet = false;
  }

  onDoneClick() {
    this.isDone = false;
    this.running = false;
    this.uploading = false;
    this.logRows = [];
    this.error = null;
  }

  setTimeout(seconds, msg) {
    this.running = true;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._timer = setTimeout(() => {
      this._timer = null;
      this.showState("danger", msg);
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
    return this.running || this.uploading;
  }

  onUploadStart() {
    this.clearLog();
    this.uploading = true;
    this.showState('info', 'system.states.uploading');
    this.progressPercents = 0;
  }

  onUploadProgress(event) {
    this.progressPercents = event.completed;
  }

  onUploadFinish() {
    this.uploading = false;
    this.running = true;
    this.setProgressTimeout();
    if (!this._mqttStatusIsSet) {
      this.showState('info', 'system.states.uploaded')
    }
  }

  onUploadError(event) {
    var message = event.uploadResponse.data;
    this.addLogRow("Upload error: " + message);
    console.error("Upload error: ", message);
    if (!this._mqttStatusIsSet) {
      this.showState('danger', "system.states.upload_error");
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
  updateStatus(msg_payload) {
    var rows = msg_payload.trim().split("\n")
    for (var i = 0; i < rows.length; i++) {
      this.updateSingleStatus(rows[i]);
    }

    this.receivedFirstStatus = true;
  }

  updateSingleStatus(msg_payload) {
    var p = msg_payload.indexOf(' ');
    var type = (p < 0) ? msg_payload : msg_payload.substr(0, p);
    var payload = (p < 0) ? msg_payload : msg_payload.substr(p+1, msg_payload.length);
    this._mqttStatusIsSet = true;

    if (type == 'IDLE') {
      this._mqttStatusIsSet = false;

      if (this.receivedFirstStatus && this.running) {
        this.clearTimeouts();
        if (!this.error) {
          this.showState('success', 'system.states.complete');
        }
        this.showDoneButton('system.buttons.hide');
      }
    }

    if (this.receivedFirstStatus) {
      if (type == 'INFO') {
        this.showState('info', payload);
        this.setProgressTimeout();
      } else if (type == 'ERROR') {
        if (!payload) {
          payload = "system.errors.unknown";
        }
        this.error = payload;
        this.showState('danger', payload);
        this.setProgressTimeout();
      } else if (type == 'REBOOT') {
        this.showState('warning', 'system.states.reboot');
        this.setRebootTimeout();
      }
    }
  }

  updateProgress(msg_payload) {
    this.progressPercents = parseInt(msg_payload);
    this.setProgressTimeout();
  }

  updateLog(msg_payload) {
    var rows = msg_payload.trim().split("\n")
    for (var i = 0; i < rows.length; i++) {
      this.logRows.push(rows[i]);
    }
    if (this._mqttStatusIsSet) {
      this.setProgressTimeout();
    }
  }
};

export default FirmwareUpdateStore;
