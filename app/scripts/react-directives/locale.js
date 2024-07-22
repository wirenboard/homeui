import i18n from '../i18n/react/config';

export const setReactLocale = () => {
  const language = localStorage.getItem('language');
  i18n.changeLanguage(language);
};
