import { type NumberStore, ObjectStore, StoreBuilder, loadJsonSchema } from '@/stores/json-schema-editor';

// Optional integer field: not required, no show_editor / opt-in. It starts
// disabled when absent from the loaded value, and starts enabled when the loaded
// value already contains it.
const OPTIONAL_LEVEL_SCHEMA = {
  type: 'object',
  properties: {
    level: { type: 'integer', title: 'Level', minimum: 1, maximum: 100, propertyOrder: 1 },
  },
};

// Shown-but-nullable field (show_editor + allow_undefined): always rendered, yet
// the schema explicitly permits leaving it empty.
const NULLABLE_SHOWN_SCHEMA = {
  type: 'object',
  properties: {
    level: {
      type: 'integer',
      title: 'Level',
      minimum: 1,
      maximum: 100,
      options: { wb: { show_editor: true, allow_undefined: true } },
      propertyOrder: 1,
    },
  },
};

const build = (schema: object, value: object) =>
  new ObjectStore(loadJsonSchema(schema), value, false, new StoreBuilder());

// Simulate the user deleting the number input's contents.
const clearLevel = (store: ObjectStore) =>
  (store.getParamByKey('level')!.store as NumberStore).setEditString('');

describe('ObjectParamStore: an enabled param must carry a value', () => {
  test('a field opted in at runtime errors once its value is cleared', () => {
    const store = build(OPTIONAL_LEVEL_SCHEMA, {});
    const param = store.getParamByKey('level')!;
    expect(param.disabled).toBe(true); // starts disabled: absent from the loaded value

    param.enable(); // opt in → seeded to the schema minimum
    expect(param.store.value).toBe(1);

    clearLevel(store);
    expect(param.store.value).toBeUndefined();
    expect(param.store.error?.key).toBe('json-editor.errors.required');
    expect(store.hasErrors).toBe(true);
  });

  test('a field loaded with a value (never re-enabled) also errors when cleared', () => {
    // Regression guard: a field that arrives with a value starts enabled and never
    // goes through enable(), so the forbid-undefined flag must be seeded in the constructor.
    const store = build(OPTIONAL_LEVEL_SCHEMA, { level: 40 });
    const param = store.getParamByKey('level')!;
    expect(param.disabled).toBe(false); // starts enabled: loaded with a value

    clearLevel(store);
    expect(param.store.value).toBeUndefined();
    expect(param.store.error?.key).toBe('json-editor.errors.required');
    expect(store.hasErrors).toBe(true);
  });

  test('a disabled (opted-out) field may be undefined without error and is dropped from the value', () => {
    const store = build(OPTIONAL_LEVEL_SCHEMA, {});
    const param = store.getParamByKey('level')!;
    expect(param.disabled).toBe(true);
    expect(param.store.value).toBeUndefined();
    expect(param.store.hasErrors).toBe(false);
    expect(store.hasErrors).toBe(false);
    expect(store.value).toEqual({});
  });

  test('a shown allow_undefined field stays nullable — empty is not an error', () => {
    const store = build(NULLABLE_SHOWN_SCHEMA, {});
    const param = store.getParamByKey('level')!;
    expect(param.disabled).toBe(false); // show_editor → always shown
    expect(param.store.value).toBeUndefined(); // allow_undefined → not seeded
    expect(param.store.hasErrors).toBe(false);
    expect(store.hasErrors).toBe(false);

    // typing a value and clearing it again must not turn it into an error either
    param.store.setValue(50);
    clearLevel(store);
    expect(param.store.hasErrors).toBe(false);
    expect(store.hasErrors).toBe(false);
  });

  test('opting a field out clears its error and drops it from the value', () => {
    const store = build(OPTIONAL_LEVEL_SCHEMA, { level: 40 });
    const param = store.getParamByKey('level')!;

    clearLevel(store);
    expect(store.hasErrors).toBe(true); // enabled + empty → blocks the form

    param.disable(); // opt out
    expect(param.disabled).toBe(true);
    expect(param.store.hasErrors).toBe(false);
    expect(store.hasErrors).toBe(false);
    expect(store.value).toEqual({});
  });
});
