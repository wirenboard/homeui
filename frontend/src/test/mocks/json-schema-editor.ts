export const loadJsonSchemaMock = vi.fn(() => ({ translations: {} }));

export class ObjectStore {
  value: any = {};
  setValue = vi.fn();
  commit = vi.fn();
  setDefault = vi.fn();
  getParamByKey = vi.fn();
  constructor(public schema?: any, public config?: any) {
    this.value = config ?? {};
  }
}

export class StoreBuilder {}

export class Translator {
  addTranslations = vi.fn();
}

export { loadJsonSchemaMock as loadJsonSchema };
