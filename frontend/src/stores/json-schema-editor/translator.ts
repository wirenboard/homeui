import { TranslationsByLocale } from './types';

export default class Translator {
  private _translations: TranslationsByLocale;

  constructor(translations: TranslationsByLocale) {
    this._translations = translations;
  }

  find(key: string, lang: string): string {
    return this._translations?.[lang]?.[key] || this._translations?.['en']?.[key] || key;
  }
}
