export function getTranslation(key, lang, translations) {
  return translations?.[lang]?.[key] || translations?.en?.[key] || key;
}
