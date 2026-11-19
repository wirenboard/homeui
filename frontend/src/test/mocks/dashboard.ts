import { faker } from '@faker-js/faker';
import type { Mock } from 'vitest';

export function makeDashboard(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.alphanumeric(8),
    name: faker.lorem.words(2),
    isSvg: false,
    options: {},
    widgets: [faker.string.alphanumeric(4)],
    toggleVisibility: vi.fn() as Mock,
    delete: vi.fn().mockResolvedValue(undefined) as Mock,
    ...overrides,
  };
}
