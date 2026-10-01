import { FormStore } from './form-store';
import { NumberStore } from './number-store';
import { OneOfStore } from './one-of-store';
import { StringStore } from './string-store';

vi.mock('@/i18n/config', () => ({ default: { t: vi.fn((key: string) => key) } }));

describe('OneOfStore', () => {
  function makeOneOf() {
    const store = new OneOfStore('choice');

    const strForm = new FormStore('String variant');
    strForm.add('text', new StringStore({ name: 'Text', value: '' }));

    const numForm = new FormStore('Number variant');
    numForm.add('num', new NumberStore({ name: 'Num', value: 0, strict: true }));

    store.add(strForm, (v) => typeof v?.text === 'string');
    store.add(numForm, (v) => typeof v?.num === 'number');

    return store;
  }

  test('add creates options in optionsStore', () => {
    const store = makeOneOf();
    expect(store.items).toHaveLength(2);
    expect(store.optionsStore.options).toHaveLength(2);
  });

  test('setValue selects matching form', () => {
    const store = makeOneOf();
    store.setValue({ text: 'hello' });

    expect(store.optionsStore.value).toBe(0);
    expect(store.selectedForm).toBe(store.items[0]);
  });

  test('setValue with no match clears selection', () => {
    const store = makeOneOf();
    store.setValue({ unknown: true });

    expect(store.optionsStore.value).toBeNull();
  });

  test('value returns selectedForm value', () => {
    const store = makeOneOf();
    store.setValue({ text: 'hello' });
    expect(store.value).toEqual({ text: 'hello' });
  });

  test('hasErrors when no selection', () => {
    const store = makeOneOf();
    expect(store.hasErrors).toBe(true);
  });

  test('hasErrors false when valid selection', () => {
    const store = makeOneOf();
    store.setValue({ text: 'valid' });
    expect(store.hasErrors).toBe(false);
  });

  test('isDirty false when no selection', () => {
    const store = makeOneOf();
    expect(store.isDirty).toBe(false);
  });

  test('isDirty true when selection changes', () => {
    const store = makeOneOf();
    store.setValue({ text: 'a' });
    store.submit();
    store.setValue({ num: 5 });
    expect(store.isDirty).toBe(true);
  });

  test('submit commits both optionsStore and selectedForm', () => {
    const store = makeOneOf();
    store.setValue({ text: 'a' });
    store.submit();
    expect(store.optionsStore.isDirty).toBe(false);
  });

  test('reset reverts to initial', () => {
    const store = makeOneOf();
    store.setValue({ text: 'a' });
    store.submit();
    store.setValue({ num: 5 });
    store.reset();
    expect(store.optionsStore.value).toBe(0);
  });
});
