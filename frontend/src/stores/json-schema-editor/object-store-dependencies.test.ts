import {
  type JsonSchema,
  type PropertyStore,
  ObjectStore,
  StoreBuilder,
  loadJsonSchema,
} from '@/stores/json-schema-editor';
import { ExactNumber } from '@/utils/exact-number';

// 2^54 is above the safe range, yet prints back exactly, so a schema can hold it as a number
const BIG_ID = '18014398509481984';

const build = (properties: Record<string, object>, value: object, required: string[] = Object.keys(properties)) =>
  new ObjectStore(loadJsonSchema({ type: 'object', required, properties }), value, false, new StoreBuilder());

const isShown = (store: ObjectStore, key: string) => store.params.some((param) => param.key === key);

const MODE = { type: 'string', enum: ['tcp', 'udp', 'serial'], propertyOrder: 1 };

const withDeps = (schema: object, dependencies: object) => ({ ...schema, options: { dependencies } });

// A minimal store holding any value as is, e.g. an ExactNumber that no StoreBuilder store produces
const fakeStore = (value: unknown, schema: JsonSchema): PropertyStore => ({
  value: value as PropertyStore['value'],
  schema,
  isDirty: false,
  hasErrors: false,
  error: undefined,
  required: true,
  storeType: 'number',
  defaultText: '',
  setUndefined: () => {},
  setDefault: () => {},
  setValue: () => {},
  commit: () => {},
  reset: () => {},
  setForbidUndefined: () => {},
});

class FakeValueStoreBuilder extends StoreBuilder {
  createStore(schema: JsonSchema, initialValue: unknown, required: boolean): PropertyStore | undefined {
    if (schema.format === 'fake') {
      return fakeStore(initialValue, schema);
    }
    return super.createStore(schema, initialValue, required);
  }
}

// `port` depends on `id`, which holds the given value as is
const dependentOn = (idValue: unknown, choice: unknown) => {
  const store = new ObjectStore(
    loadJsonSchema({
      type: 'object',
      required: ['id', 'port'],
      properties: {
        id: { type: 'number', format: 'fake' },
        port: withDeps({ type: 'string' }, { id: choice }),
      },
    }),
    { id: idValue, port: 'x' },
    false,
    new FakeValueStoreBuilder(),
  );
  return isShown(store, 'port');
};

describe('ObjectStore.params hides params by options.dependencies', () => {
  test('a param without dependencies is always fulfilled', () => {
    const store = build({ mode: MODE, port: { type: 'integer' } }, { mode: 'tcp', port: 1 });
    expect(isShown(store, 'port')).toBe(true);
  });

  test('a scalar dependency shows the param only while the sibling has that value', () => {
    const store = build({
      mode: MODE,
      port: withDeps({ type: 'integer' }, { mode: 'tcp' }),
    }, { mode: 'tcp', port: 502 });
    expect(isShown(store, 'port')).toBe(true);

    store.getParamByKey('mode')!.store.setValue('serial');
    expect(isShown(store, 'port')).toBe(false);

    store.getParamByKey('mode')!.store.setValue('tcp');
    expect(isShown(store, 'port')).toBe(true);
  });

  test('an array of values means any of them', () => {
    const store = build({
      mode: MODE,
      port: withDeps({ type: 'integer' }, { mode: ['tcp', 'udp'] }),
    }, { mode: 'udp', port: 502 });
    expect(isShown(store, 'port')).toBe(true);

    store.getParamByKey('mode')!.store.setValue('serial');
    expect(isShown(store, 'port')).toBe(false);
  });

  test.each([
    [true, true, false],
    [false, false, true],
    [undefined, false, false],
    ['', false, false],
    [0, false, false],
    ['x', false, false],
    [1, false, false],
  ])('sibling value %s: `true` fulfilled is %s, `false` is %s (strict equality)', (value, isTrue, isFalse) => {
    expect(dependentOn(value, true)).toBe(isTrue);
    expect(dependentOn(value, false)).toBe(isFalse);
  });

  test('`true` / `false` dependencies follow a real checkbox edit', () => {
    const store = build({
      secure: { type: 'boolean', propertyOrder: 1 },
      cert: withDeps({ type: 'string', propertyOrder: 2 }, { secure: true }),
      hint: withDeps({ type: 'string', propertyOrder: 3 }, { secure: false }),
    }, { secure: false, cert: 'c', hint: 'a' });
    expect(isShown(store, 'cert')).toBe(false);
    expect(isShown(store, 'hint')).toBe(true);

    store.getParamByKey('secure')!.store.setValue(true);
    expect(isShown(store, 'cert')).toBe(true);
    expect(isShown(store, 'hint')).toBe(false);
  });

  test('several keys must all match (AND), whatever their kind', () => {
    const store = build({
      mode: MODE,
      secure: { type: 'boolean', propertyOrder: 2 },
      cert: withDeps({ type: 'string', propertyOrder: 3 }, { mode: ['tcp', 'udp'], secure: true }),
    }, { mode: 'tcp', secure: true, cert: 'c' });
    expect(isShown(store, 'cert')).toBe(true);

    store.getParamByKey('secure')!.store.setValue(false);
    expect(isShown(store, 'cert')).toBe(false);

    store.getParamByKey('secure')!.store.setValue(true);
    store.getParamByKey('mode')!.store.setValue('serial');
    expect(isShown(store, 'cert')).toBe(false);
  });

  test('a param depending on a hidden sibling is hidden too, even if the value matches', () => {
    const store = build({
      mode: MODE,
      secure: withDeps({ type: 'boolean', propertyOrder: 2 }, { mode: 'tcp' }),
      cert: withDeps({ type: 'string', propertyOrder: 3 }, { secure: true }),
    }, { mode: 'tcp', secure: true, cert: 'c' });
    expect(isShown(store, 'cert')).toBe(true);

    store.getParamByKey('mode')!.store.setValue('serial');
    expect(isShown(store, 'secure')).toBe(false);
    expect(isShown(store, 'cert')).toBe(false);
  });

  test('params depending on each other in a cycle are all hidden instead of throwing', () => {
    const store = build({
      a: withDeps({ type: 'string', propertyOrder: 1 }, { b: 'x' }),
      b: withDeps({ type: 'string', propertyOrder: 2 }, { a: 'x' }),
      c: withDeps({ type: 'string', propertyOrder: 3 }, { e: 'x' }),
      d: withDeps({ type: 'string', propertyOrder: 4 }, { c: 'x' }),
      e: withDeps({ type: 'string', propertyOrder: 5 }, { d: 'x' }),
      f: withDeps({ type: 'string', propertyOrder: 6 }, { a: 'x' }),
    }, { a: 'x', b: 'x', c: 'x', d: 'x', e: 'x', f: 'x' });
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach((key) => expect(isShown(store, key)).toBe(false));
    expect(store.value).toEqual({});
  });

  test('a dependency on a missing sibling is never fulfilled', () => {
    const store = build({
      mode: MODE,
      port: withDeps({ type: 'integer' }, { nope: 'tcp' }),
    }, { mode: 'tcp', port: 1 });
    expect(isShown(store, 'port')).toBe(false);
  });

  test('a disabled (opted-out) checkbox matches neither `true` nor `false`', () => {
    const store = build({
      secure: { type: 'boolean', propertyOrder: 1 },
      cert: withDeps({ type: 'string', propertyOrder: 2 }, { secure: true }),
      hint: withDeps({ type: 'string', propertyOrder: 3 }, { secure: false }),
    }, { cert: 'c', hint: 'a' }, ['cert', 'hint']);
    expect(store.getParamByKey('secure')!.disabled).toBe(true);
    expect(isShown(store, 'cert')).toBe(false);
    expect(isShown(store, 'hint')).toBe(false);
  });

  test('a sibling holding an ExactNumber matches the same number', () => {
    const big = ExactNumber.parse(BIG_ID);
    expect(big).toBeInstanceOf(ExactNumber);
    expect(dependentOn(big, Number(BIG_ID))).toBe(true);
    expect(dependentOn(big, [1, Number(BIG_ID)])).toBe(true);
    expect(dependentOn(big, 1)).toBe(false);
  });

  test('a mistyped sibling value fulfils no condition', () => {
    const store = build({
      level: { type: 'integer', propertyOrder: 1 },
      a: withDeps({ type: 'string', propertyOrder: 2 }, { level: 'abc' }),
      b: withDeps({ type: 'string', propertyOrder: 3 }, { level: ['abc', 1] }),
    }, { level: 'abc', a: 'x', b: 'y' });
    expect(isShown(store, 'a')).toBe(false);
    expect(isShown(store, 'b')).toBe(false);
  });
});

describe('ObjectStore with dependencies', () => {
  const schema = {
    mode: MODE,
    port: withDeps({ type: 'integer', minimum: 1, maximum: 100, propertyOrder: 2 }, { mode: 'tcp' }),
  };

  test('a hidden param is left out of the value and its errors do not block saving', () => {
    const store = build(schema, { mode: 'tcp', port: 50 });
    store.getParamByKey('port')!.store.setValue(500);
    expect(store.hasErrors).toBe(true);

    store.getParamByKey('mode')!.store.setValue('serial');
    expect(store.value).toEqual({ mode: 'serial' });
    expect(store.hasErrors).toBe(false);
  });

  test('a not-required param that becomes visible stays disabled until the user enables it', () => {
    const store = build(schema, { mode: 'serial' }, ['mode']);
    const port = store.getParamByKey('port')!;
    expect(port.disabled).toBe(true);

    store.getParamByKey('mode')!.store.setValue('tcp');
    expect(isShown(store, 'port')).toBe(true);
    expect(port.disabled).toBe(true);
    expect(store.value).toEqual({ mode: 'tcp' });
  });

  test('a hidden param keeps its value through commit and reset, and it comes back when shown', () => {
    const store = build(schema, { mode: 'tcp', port: 50 });
    store.getParamByKey('port')!.store.setValue(70);
    store.getParamByKey('mode')!.store.setValue('serial');
    store.commit();
    expect(store.isDirty).toBe(false);

    store.getParamByKey('mode')!.store.setValue('tcp');
    expect(store.value).toEqual({ mode: 'tcp', port: 70 });

    store.getParamByKey('port')!.store.setValue(80);
    store.getParamByKey('mode')!.store.setValue('serial');
    store.reset();
    expect(store.value).toEqual({ mode: 'serial' });
    store.getParamByKey('mode')!.store.setValue('tcp');
    expect(store.value).toEqual({ mode: 'tcp', port: 70 });
  });

  test('isDirty ignores an edited param once it is hidden', () => {
    const store = build(schema, { mode: 'tcp', port: 50 });
    store.getParamByKey('port')!.store.setValue(70);
    expect(store.isDirty).toBe(true);

    // commit only mode, so the remaining dirtiness can come from the hidden port alone
    store.getParamByKey('mode')!.store.setValue('serial');
    store.getParamByKey('mode')!.store.commit();
    expect(store.isDirty).toBe(false);
  });
});
