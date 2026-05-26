import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';

i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  lng: localStorage.getItem('language'),
  resources: {
    en: {
      translations: en,
    },
    ru: {
      translations: ru,
    },
  },
  defaultNS: 'translations',
  react: {
    transSupportBasicHtmlNodes: true,
  },
});

i18n.languages = ['en', 'ru'];

document.documentElement.lang = i18n.language;
i18n.on('languageChanged', (lang) => {
  document.documentElement.lang = lang;
});

export default i18n;
