import type { TranslationsByLocale, JsonSchema } from './types';

export class Translator {
  private _translations: TranslationsByLocale[] = [];

  addTranslations(translations?: TranslationsByLocale): void {
    if (translations) {
      this._translations.push(translations);
    }
  }

  find(key: string, lang: string): string {
    for (const translations of this._translations) {
      if (translations[lang]?.[key] !== undefined) {
        return translations[lang][key];
      }
      if (translations.en?.[key] !== undefined) {
        return translations.en[key];
      }
    }
    return key;
  }
}
