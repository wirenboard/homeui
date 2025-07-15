import type { TranslationsByLocale, Translations } from './types';

export class Translator {
  private _translations: TranslationsByLocale;

  constructor(translations: TranslationsByLocale) {
    this._translations = translations;
  }

  find(key: string, lang: string): string {
    return (this._translations[lang]?.[key] ?? this._translations.en?.[key]) ?? key;
  }
}

export const makeTranslator = (schema: unknown): Translator => {
  if (typeof schema !== 'object' || schema === null) {
    return new Translator({});
  }
  return new Translator((schema as Translations)?.translations ?? {});
};
