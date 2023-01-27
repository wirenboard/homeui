import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  lng: 'en',
  resources: {
    en: {
      translations: require('./locales/en/translations.json'),
    },
    ru: {
      translations: require('./locales/ru/translations.json'),
    },
  },
  ns: ['translations'],
  defaultNS: 'translations',
  react: {
    transSupportBasicHtmlNodes: true,
  },
});

i18n.languages = ['en', 'ru'];

export default i18n;
