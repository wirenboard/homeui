import { StringStore } from './string-store';

describe('StringStore', () => {
  test('initializes with string value', () => {
    const store = new StringStore({ name: 'Name', value: 'hello' });
    expect(store.value).toBe('hello');
    expect(store.initialValue).toBe('hello');
    expect(store.name).toBe('Name');
  });

  test('setValue with string', () => {
    const store = new StringStore({ name: 's' });
    store.setValue('test');
    expect(store.value).toBe('test');
  });

  test('setValue with number converts to string', () => {
    const store = new StringStore({ name: 's' });
    store.setValue(42 as any);
    expect(store.value).toBe('42');
  });

  test('setValue with undefined sets empty string', () => {
    const store = new StringStore({ name: 's', value: 'x' });
    store.setValue(undefined);
    expect(store.value).toBe('');
  });

  test('validator is called on setValue', () => {
    const validator = vi.fn((v: string) => v.length < 3 ? 'too short' : '');
    const store = new StringStore({ name: 's', validator });
    store.setValue('ab');
    expect(store.error).toBe('too short');
    expect(store.hasErrors).toBe(true);

    store.setValue('abc');
    expect(store.error).toBe('');
    expect(store.hasErrors).toBe(false);
  });

  test('isDirty tracks changes', () => {
    const store = new StringStore({ name: 's', value: 'a' });
    expect(store.isDirty).toBe(false);
    store.setValue('b');
    expect(store.isDirty).toBe(true);
  });

  test('submit saves current value as initial', () => {
    const store = new StringStore({ name: 's', value: 'a' });
    store.setValue('b');
    store.submit();
    expect(store.isDirty).toBe(false);
    expect(store.initialValue).toBe('b');
  });

  test('reset reverts to initialValue', () => {
    const store = new StringStore({ name: 's', value: 'original' });
    store.setValue('changed');
    store.reset();
    expect(store.value).toBe('original');
  });

  test('setFormColumns updates formColumns', () => {
    const store = new StringStore({ name: 's' });
    store.setFormColumns(4);
    expect(store.formColumns).toBe(4);
  });

  test('setReadOnly updates readOnly', () => {
    const store = new StringStore({ name: 's' });
    store.setReadOnly(true);
    expect(store.readOnly).toBe(true);
  });

  test('constructor respects editType default', () => {
    const store = new StringStore({ name: 's' });
    expect(store.editType).toBe('text');
  });

  test('constructor respects custom editType', () => {
    const store = new StringStore({ name: 's', editType: 'password' });
    expect(store.editType).toBe('password');
  });
});
