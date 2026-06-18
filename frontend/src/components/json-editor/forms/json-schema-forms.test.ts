import { Translator } from '@/stores/json-schema-editor';
import { ArrayStore } from './array-store';
import { BooleanStore } from './boolean-store';
import { FormStore } from './form-store';
import { createStore, makeParameterStoreFromJsonSchema } from './json-schema-forms';
import { NumberStore } from './number-store';
import { OneOfStore } from './one-of-store';
import { OptionsStore } from './options-store';
import { StringStore } from './string-store';

vi.mock('@/i18n/config', () => ({ default: { t: vi.fn((key: string) => key), language: 'en' } }));
vi.mock('@/stores/json-schema-editor', () => ({
  Translator: class {
    addTranslations() {}
    find(key: string) {
      return key;
    }
  },
}));

describe('createStore', () => {
  const translator = new Translator();

  test('creates BooleanStore for boolean type', () => {
    const store = createStore({ type: 'boolean', title: 'Flag', default: true }, translator);
    expect(store).toBeInstanceOf(BooleanStore);
    expect(store.value).toBe(true);
  });

  test('creates StringStore for string type', () => {
    const store = createStore({ type: 'string', title: 'Name', default: 'hello' }, translator);
    expect(store).toBeInstanceOf(StringStore);
    expect(store.value).toBe('hello');
  });

  test('creates OptionsStore for string with enum', () => {
    const store = createStore({
      type: 'string',
      title: 'Color',
      enum: ['red', 'green', 'blue'],
      default: 'red',
    }, translator);
    expect(store).toBeInstanceOf(OptionsStore);
    expect(store.value).toBe('red');
  });

  test('creates NumberStore for number type', () => {
    const store = createStore({
      type: 'number',
      title: 'Weight',
      minimum: 0,
      maximum: 100,
      default: 50,
    }, translator);
    expect(store).toBeInstanceOf(NumberStore);
    expect(store.value).toBe(50);
    expect(store.min).toBe(0);
    expect(store.max).toBe(100);
  });

  test('creates NumberStore with integer type', () => {
    const store = createStore({
      type: 'integer',
      title: 'Count',
      default: 5,
    }, translator);
    expect(store).toBeInstanceOf(NumberStore);
    expect(store.type).toBe('integer');
  });

  test('creates OptionsStore for integer with enum', () => {
    const store = createStore({
      type: 'integer',
      title: 'Code',
      enum: [1, 2, 3],
      default: 1,
    }, translator);
    expect(store).toBeInstanceOf(OptionsStore);
  });

  test('creates FormStore for object type', () => {
    const store = createStore({
      type: 'object',
      title: 'Config',
      properties: {
        name: { type: 'string', title: 'Name', default: 'x' },
        count: { type: 'integer', title: 'Count', default: 1 },
      },
    }, translator);
    expect(store).toBeInstanceOf(FormStore);
    expect(store.contains('name')).toBe(true);
    expect(store.contains('count')).toBe(true);
  });

  test('creates ArrayStore for array type', () => {
    const store = createStore({
      type: 'array',
      title: 'Items',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', title: 'Label', default: '' },
        },
      },
    }, translator);
    expect(store).toBeInstanceOf(ArrayStore);
  });

  test('creates OneOfStore for oneOf schema', () => {
    const store = createStore({
      title: 'Either',
      oneOf: [
        { type: 'object', title: 'A', required: ['a'], properties: { a: { type: 'string', title: 'A' } } },
        { type: 'object', title: 'B', required: ['b'], properties: { b: { type: 'number', title: 'B' } } },
      ],
    }, translator);
    expect(store).toBeInstanceOf(OneOfStore);
    expect(store.items).toHaveLength(2);
  });

  test('resolves $ref from definitions', () => {
    const store = createStore({
      $ref: '#/definitions/MyType',
      definitions: {
        MyType: { type: 'string', title: 'Ref', default: 'resolved' },
      },
    }, translator);
    expect(store).toBeInstanceOf(StringStore);
    expect(store.value).toBe('resolved');
  });

  test('applies grid_columns via setFormColumns', () => {
    const store = createStore({
      type: 'string',
      title: 'S',
      default: '',
      options: { grid_columns: 6 },
    }, translator);
    expect(store.formColumns).toBe(6);
  });

  test('sorts properties by propertyOrder', () => {
    const store = createStore({
      type: 'object',
      title: 'Ordered',
      properties: {
        z: { type: 'string', title: 'Z', default: '', propertyOrder: 2 },
        a: { type: 'string', title: 'A', default: '', propertyOrder: 1 },
      },
    }, translator) as FormStore;
    const keys = Object.keys(store.params);
    expect(keys).toEqual(['a', 'z']);
  });

  test('returns undefined for object without properties', () => {
    const store = createStore({ type: 'object', title: 'Empty' }, translator);
    expect(store).toBeUndefined();
  });

  test('returns undefined for array without items', () => {
    const store = createStore({ type: 'array', title: 'Empty' }, translator);
    expect(store).toBeUndefined();
  });
});

describe('makeParameterStoreFromJsonSchema', () => {
  test('creates store from full schema', () => {
    const store = makeParameterStoreFromJsonSchema({
      type: 'object',
      title: 'Root',
      properties: {
        enabled: { type: 'boolean', title: 'Enabled', default: false },
      },
    });
    expect(store).toBeInstanceOf(FormStore);
  });
});
