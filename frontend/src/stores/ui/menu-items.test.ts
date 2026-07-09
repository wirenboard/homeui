import { describe, expect, test, vi } from 'vitest';

vi.mock('@/i18n/config', () => ({ default: { language: 'en' } }));
vi.mock('@/stores/auth', () => ({ authStore: {} }));

import { mergeMenuItems } from './menu-items';

describe('mergeMenuItems', () => {
  test('override by id carries isShow so requiredRole can hide a base item', () => {
    const base = [{ label: 'Docs', id: 'docs', url: '/docs' }];
    const custom = [{ label: 'Docs', id: 'docs', url: '/docs', isShow: false }];

    const result = mergeMenuItems(base, custom);

    expect(result.find((i) => i.id === 'docs').isShow).toBe(false);
  });
});
