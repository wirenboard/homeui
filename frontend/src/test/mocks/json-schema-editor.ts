import type { Mock } from 'vitest';

export const loadJsonSchemaMock: Mock = vi.fn(() => ({ translations: {} }));

export class ObjectStore {
  value: any = {};
  setValue: Mock = vi.fn();
  commit: Mock = vi.fn();
  setDefault: Mock = vi.fn();
  getParamByKey: Mock = vi.fn();
  constructor(public schema?: any, public config?: any) {
    this.value = config ?? {};
  }
}

export class StoreBuilder {}

export class Translator {
  addTranslations: Mock = vi.fn();
}

export { loadJsonSchemaMock as loadJsonSchema };
