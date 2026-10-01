import '@testing-library/jest-dom/vitest';

// @tanstack/react-virtual deliberately flushSyncs from measureElement's ref callback (a React
// commit-phase callback in any environment) so a row's grown height lands in the same paint as
// the estimate it corrects — see console-log-scroller.tsx. React warns about that regardless,
// it's not a real bug; only this exact message is filtered, everything else still logs.
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('flushSync was called from inside a lifecycle method')) {
    return;
  }
  originalConsoleError(...args);
};

// mqtt-client.ts and main.tsx deliberately console.warn on a lost connection / a failed HTTPS
// switch — production logging that error-path tests (mqtt-client.test.ts, main.test.tsx)
// exercise on purpose. Not a bug to fix; only these exact messages are filtered.
const originalConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string'
    && (args[0].includes('Server connection lost') || args[0].includes('Failed to switch to HTTPS'))
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  const i18n = { language: 'en', changeLanguage: vi.fn(), t };
  return {
    useTranslation: () => ({ t, i18n }),
    Trans: ({ children }: any) => children,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
  };
});
