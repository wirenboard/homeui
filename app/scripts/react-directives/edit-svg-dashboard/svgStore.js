'use strict';

import { makeAutoObservable } from 'mobx';
import isEmpty from 'lodash/isEmpty';

class SvgStore {
  constructor() {
    this.svg = {};

    makeAutoObservable(this);
  }

  get hasSvg() {
    return !isEmpty(this.svg);
  }

  setSvg(svg) {
    this.svg = svg || {};
  }

  exportSvg(fileName) {
    const blob = new Blob([this.svg], { type: 'image/svg+xml' });
    const url = (window.URL || window.webkitURL).createObjectURL(blob);
    const name = fileName + '.svg';
    const link = document.createElement('a');
    link.download = name;
    link.href = url;
    link.click();
  }
}

export default SvgStore;
