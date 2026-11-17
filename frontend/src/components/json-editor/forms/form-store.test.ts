import { BooleanStore } from './boolean-store';
import { FormStore } from './form-store';
import { NumberStore } from './number-store';
import { StringStore } from './string-store';

vi.mock('@/i18n/config', () => ({ default: { t: vi.fn((key: string) => key) } }));

describe('FormStore', () => {
  function makeForm() {
    const form = new FormStore('test');
    form.add('name', new StringStore({ name: 'Name', value: 'Alice' }));
    form.add('age', new NumberStore({ name: 'Age', value: 30, strict: true }));
    form.add('active', new BooleanStore({ name: 'Active', value: true }));
    return form;
  }

  test('add stores params and contains returns true', () => {
    const form = new FormStore('test');
    form.add('key', new StringStore({ name: 'k', value: '' }));
    expect(form.contains('key')).toBe(true);
    expect(form.contains('other')).toBe(false);
  });

  test('add ignores null/undefined', () => {
    const form = new FormStore('test');
    form.add('a', null);
    form.add('b', undefined);
    expect(form.hasProperties).toBe(false);
  });

  test('remove deletes param', () => {
    const form = makeForm();
    form.remove('age');
    expect(form.contains('age')).toBe(false);
  });

  test('setValue propagates to children', () => {
    const form = makeForm();
    form.setValue({ name: 'Bob', age: 25, active: false });
    expect(form.params.name.value).toBe('Bob');
    expect(form.params.age.value).toBe(25);
    expect(form.params.active.value).toBe(false);
  });

  test('setValue with missing keys sets undefined', () => {
    const form = makeForm();
    form.setValue({ name: 'Bob' });
    expect(form.params.age.value).toBeUndefined();
  });

  test('value getter collects child values', () => {
    const form = makeForm();
    const val = form.value;
    expect(val).toEqual({ name: 'Alice', age: 30, active: true });
  });

  test('isDirty is false initially', () => {
    expect(makeForm().isDirty).toBe(false);
  });

  test('isDirty is true when any child changes', () => {
    const form = makeForm();
    (form.params.name as StringStore).setValue('Changed');
    expect(form.isDirty).toBe(true);
  });

  test('hasErrors reflects children', () => {
    const form = new FormStore('test');
    const num = new NumberStore({ name: 'n', value: 'bad' as any, strict: true });
    form.add('n', num);
    expect(form.hasErrors).toBe(true);
  });

  test('hasProperties returns false for empty form', () => {
    expect(new FormStore('empty').hasProperties).toBe(false);
  });

  test('submit propagates to children', () => {
    const form = makeForm();
    (form.params.name as StringStore).setValue('New');
    form.submit();
    expect(form.isDirty).toBe(false);
  });

  test('reset propagates to children', () => {
    const form = makeForm();
    (form.params.name as StringStore).setValue('New');
    form.reset();
    expect((form.params.name as StringStore).value).toBe('Alice');
  });
});
