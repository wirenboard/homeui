import { BooleanStore } from './boolean-store';

describe('BooleanStore', () => {
  test('initializes with coerced value', () => {
    expect(new BooleanStore({ name: 'b', value: true }).value).toBe(true);
    expect(new BooleanStore({ name: 'b', value: false }).value).toBe(false);
    expect(new BooleanStore({ name: 'b', value: undefined }).value).toBe(false);
  });

  test('setValue coerces to boolean', () => {
    const store = new BooleanStore({ name: 'b', value: false });
    store.setValue(true);
    expect(store.value).toBe(true);
    store.setValue(undefined as any);
    expect(store.value).toBe(false);
  });

  test('isDirty tracks changes from initial value', () => {
    const store = new BooleanStore({ name: 'b', value: false });
    expect(store.isDirty).toBe(false);
    store.setValue(true);
    expect(store.isDirty).toBe(true);
  });

  test('submit updates initialValue', () => {
    const store = new BooleanStore({ name: 'b', value: false });
    store.setValue(true);
    store.submit();
    expect(store.isDirty).toBe(false);
    expect(store.initialValue).toBe(true);
  });

  test('reset reverts to initialValue', () => {
    const store = new BooleanStore({ name: 'b', value: true });
    store.setValue(false);
    store.reset();
    expect(store.value).toBe(true);
  });

  test('setFormColumns sets columns', () => {
    const store = new BooleanStore({ name: 'b', value: false });
    store.setFormColumns(6);
    expect(store.formColumns).toBe(6);
  });
});
