import { type TranslationsByLocale } from '@/stores/json-schema-editor';

export const getTranslation = (key: string, lang: string, translations: TranslationsByLocale) => {
  return translations?.[lang]?.[key] || translations?.en?.[key] || key;
};
