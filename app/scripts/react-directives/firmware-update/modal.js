import { makeAutoObservable } from 'mobx';

class DownloadBackupModalState {
  id = 'downloadBackupModal';
  active = false;
  isFirstPage = true;
  onCancel = undefined;
  onDownloadClick = undefined;

  constructor(id) {
    this.id = id ? id : this.id;
    makeAutoObservable(this);
  }

  download (url) {
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', true);
    link.style.display = 'none';

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  }

  show() {

      this.onCancel = () => {
        this.active = false;
      };
      this.onDownloadClick = () => {
        this.download("/fwupdate/download/rootfs");
        this.isFirstPage = false;
      };

      this.isFirstPage = true;
      this.active = true;

  }
}

export default DownloadBackupModalState;
