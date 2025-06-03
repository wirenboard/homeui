import { makeAutoObservable } from 'mobx';

export function checkFullscreen() {
  const fullScreenElement =
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null;

  return fullScreenElement !== null;
}

export class FullscreenStore {
  constructor() {
    this.isFullscreen = checkFullscreen();
    this._listeners = [];
    const handler = () => this.checkFullscreen();

    [
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'fullscreenchange',
      'MSFullscreenChange',
      'webkitbeginfullscreen',
      'webkitendfullscreen',
    ].forEach((ev) => {
      window.addEventListener(ev, handler);
      this._listeners.push([ev, handler]);
    });

    makeAutoObservable(this);
  }

  setFullscreen(value) {
    this.isFullscreen = value;
  }

  checkFullscreen() {
    this.isFullscreen = checkFullscreen();
  }

  toggleFullscreen() {
    let goFullScreen = null;
    let exitFullScreen = null;
    if ('requestFullscreen' in document.documentElement) {
      goFullScreen = 'requestFullscreen';
      exitFullScreen = 'exitFullscreen';
    } else if ('mozRequestFullScreen' in document.documentElement) {
      goFullScreen = 'mozRequestFullScreen';
      exitFullScreen = 'mozCancelFullScreen';
    } else if ('webkitRequestFullscreen' in document.documentElement) {
      goFullScreen = 'webkitRequestFullscreen';
      exitFullScreen = 'webkitExitFullscreen';
    } else {
      goFullScreen = 'msRequestFullscreen';
      exitFullScreen = 'msExitFullscreen';
    }

    if (this.isFullscreen) {
      document[exitFullScreen]();
    } else {
      document.documentElement[goFullScreen]();
    }
  }

  dispose() {
    this._listeners.forEach(([ev, handler]) => {
      window.removeEventListener(ev, handler);
    });
    this._listeners = [];
  }
}
