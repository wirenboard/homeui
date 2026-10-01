import { makeAutoObservable, runInAction } from 'mobx';
import { fontsApi } from '@/services/fonts-api';
import type { Font } from './types';

const FORMAT_MAP: Record<string, string> = {
  '.ttf': 'truetype',
  '.otf': 'opentype',
  '.woff': 'woff',
  '.woff2': 'woff2',
};

class FontsStore {
  fonts: Font[] = [];
  isLoading = false;

  constructor() {
    makeAutoObservable(this);
  }

  async loadFonts() {
    this.isLoading = true;
    try {
      const fonts = await fontsApi.getFonts();
      runInAction(() => {
        this.fonts = fonts;
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async deleteFont(name: string) {
    await fontsApi.deleteFont(name);
    runInAction(() => {
      this.fonts = this.fonts.filter((f) => f.name !== name);
    });
  }

  buildFontFaceCss(): string {
    return this.fonts
      .map((font) => {
        const ext = font.name.substring(font.name.lastIndexOf('.')).toLowerCase();
        const format = FORMAT_MAP[ext] || 'truetype';
        const family = font.name.substring(0, font.name.lastIndexOf('.'));
        const src = `/fonts/${encodeURIComponent(font.name)}`;
        return `@font-face { font-family: "${family}"; src: url("${src}") format("${format}"); }`;
      })
      .join('\n');
  }
}

export const fontsStore = new FontsStore();
