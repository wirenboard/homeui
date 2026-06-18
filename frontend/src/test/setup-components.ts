import '@testing-library/jest-dom/vitest';

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  const i18n = { language: 'en', changeLanguage: vi.fn(), t };
  return {
    useTranslation: () => ({ t, i18n }),
    Trans: ({ children }: any) => children,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
  };
});
