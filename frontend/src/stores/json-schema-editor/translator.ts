import type { TranslationsByLocale } from './types';

export class Translator {
  private _translations: TranslationsByLocale[] = [];

  addTranslations(translations?: TranslationsByLocale): void {
    if (translations) {
      this._translations.push(translations);
    }
  }

  find(key: string, lang: string): string {
    return this._lookup(key, lang) ?? key;
  }

  // Translations of groups and parameters are searched by id, title is used for old templates only
  findById(id: string, title: string | undefined, lang: string): string {
    return this._lookup(id, lang) ?? (title === undefined ? id : this.find(title, lang));
  }

  private _lookup(key: string, lang: string): string | undefined {
    for (const translations of this._translations) {
      if (translations[lang]?.[key] !== undefined) {
        return translations[lang][key];
      }
      if (translations.en?.[key] !== undefined) {
        return translations.en[key];
      }
    }
    return undefined;
  }
}
