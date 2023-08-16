import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  lng: 'en',
  resources: {
    en: {
      translations: require('./locales/en/translations.json'),
    },
    // temporary disabled russian language
    // ru: {
    //   translations: require('./locales/ru/translations.json'),
    // },
  },
  ns: ['translations'],
  defaultNS: 'translations',
  react: {
    transSupportBasicHtmlNodes: true,
  },
});

// temporary disabled russian language
// i18n.languages = ['en', 'ru'];
i18n.languages = ['en'];

export default i18n;
