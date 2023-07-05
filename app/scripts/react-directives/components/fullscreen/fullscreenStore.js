'use strict';

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

    [
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'fullscreenchange',
      'MSFullscreenChange',
      'webkitbeginfullscreen',
      'webkitendfullscreen',
    ].forEach(ev => {
      addEventListener(ev, () => {
        this.checkFullscreen();
      });
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
    var goFullScreen = null;
    var exitFullScreen = null;
    if ('requestFullscreen' in document.documentElement) {
      goFullScreen = 'requestFullscreen';
      exitFullScreen = 'exitFullscreen';
    } else if ('mozRequestFullScreen' in document.documentElement) {
      goFullScreen = 'mozRequestFullScreen';
      exitFullScreen = 'mozCancelFullScreen';
    } else if ('webkitRequestFullscreen' in document.documentElement) {
      goFullScreen = 'webkitRequestFullscreen';
      exitFullScreen = 'webkitExitFullscreen';
    } else if ('msRequestFullscreen') {
      goFullScreen = 'msRequestFullscreen';
      exitFullScreen = 'msExitFullscreen';
    }

    if (this.isFullscreen) {
      document[exitFullScreen]();
    } else {
      document.documentElement[goFullScreen]();
    }
  }
}
