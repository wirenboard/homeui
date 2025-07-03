import type { TranslationsByLocale, JsonSchema } from './types';

export class Translator {
  private _translations: TranslationsByLocale[] = [];

  addTranslations(translations: TranslationsByLocale): void {
    this._translations.push(translations);
  }

  find(key: string, lang: string): string {
    for (const translations of this._translations) {
      if (translations[lang]?.[key]) {
        return translations[lang][key];
      }
      if (translations.en?.[key]) {
        return translations.en[key];
      }
    }
    return key;
  }
}

export const makeTranslator = (schema: unknown): Translator => {
  let translator = new Translator();
  if (typeof schema === 'object' && schema !== null) {
    const schemaAsJsonSchema = schema as JsonSchema;
    if (schemaAsJsonSchema.translations) {
      translator.addTranslations(schemaAsJsonSchema.translations);
    }
    if (schemaAsJsonSchema.device?.translations) {
      translator.addTranslations(schemaAsJsonSchema.device.translations);
    }
  }
  return translator;
};
