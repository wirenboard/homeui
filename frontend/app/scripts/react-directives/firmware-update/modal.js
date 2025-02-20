import { makeAutoObservable } from 'mobx';

const MODAL_MODE_UPDATE = 'update';
const MODAL_MODE_UPDATE_RESET = 'update_reset';
const MODAL_MODE_FACTORY_RESET = 'factory_reset';

class DownloadBackupModalState {
  id = 'downloadBackupModal';
  active = false;
  isFirstPage = true;
  onCancel = undefined;
  onDownloadClick = undefined;
  mode = undefined;
  enableButtons = false;
  enteredConfirmationText = '';

  constructor(id) {
    this.id = id ? id : this.id;
    makeAutoObservable(this);
  }

  onConfirmationTextChange(event) {
    this.enteredConfirmationText = event.target.value;
    let unlock = (event.target.value === 'factoryreset');
    this.enableButtons = unlock;
  }

  download(url) {
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', true);
    link.style.display = 'none';

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  }

  show(mode) {
    this.mode = mode;
    // disable buttons for other modes until confirmation text is entered
    this.enableButtons = mode === MODAL_MODE_UPDATE;
    this.enteredConfirmationText = '';
    this.onCancel = () => {
      this.active = false;
    };
    this.onDownloadClick = () => {
      this.download('/fwupdate/download/rootfs');
      this.isFirstPage = false;
    };

    this.isFirstPage = true;
    this.active = true;
  }
}

export default DownloadBackupModalState;
export { MODAL_MODE_UPDATE, MODAL_MODE_UPDATE_RESET, MODAL_MODE_FACTORY_RESET };
