import { makeAutoObservable } from 'mobx';

const download = async (url) => {
    const link = document.createElement('a')

    link.setAttribute('href', url)
    link.setAttribute('download', true)
    link.style.display = 'none'

    document.body.appendChild(link)

    link.click()

    document.body.removeChild(link)
}

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

  show() {
    return new Promise((resolve, reject) => {
      this.onCancel = () => {
        this.active = false;
      };
      this.onDownloadClick = () => {
        download("/fwupdate/download/rootfs");
        this.isFirstPage = false;
      };

      this.isFirstPage = true;
      this.active = true;
    });
  }
}

export default DownloadBackupModalState;
