import { makeAutoObservable } from 'mobx';

export class SvgStore {
  public svg: string = null;

  constructor() {
    makeAutoObservable(this);
  }

  get hasSvg() {
    return !!this.svg;
  }

  get hasFontStyles() {
    if (!this.svg) {
      return false;
    }
    return /font-family\s*[:=]|font\s*[:=]/i.test(this.svg);
  }

  setSvg(svg: string) {
    this.svg = svg || null;
  }

  exportSvg(fileName: string) {
    const blob = new Blob([this.svg], { type: 'image/svg+xml' });
    const url = (window.URL || window.webkitURL).createObjectURL(blob);
    const name = fileName + '.svg';
    const link = document.createElement('a');
    link.download = name;
    link.href = url;
    link.click();
  }
}
