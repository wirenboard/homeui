import { tabLabel } from './types';

describe('tabLabel', () => {
  test('a function label is called each time, so it follows the language', () => {
    let language = 'en';
    const tab = { label: () => (language === 'en' ? 'Rules' : 'Правила') };
    expect(tabLabel(tab)).toBe('Rules');
    language = 'ru';
    expect(tabLabel(tab)).toBe('Правила');
    expect(tabLabel({ label: 'Terminal' })).toBe('Terminal');
  });
});
