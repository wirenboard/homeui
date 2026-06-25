import { ArrayStore } from './array-store';
import { FormStore } from './form-store';
import { StringStore } from './string-store';

describe('ArrayStore', () => {
  function makeItemForm(): FormStore {
    const form = new FormStore('item');
    form.add('field', new StringStore({ name: 'Field', value: '' }));
    return form;
  }

  test('starts with empty items', () => {
    const store = new ArrayStore('arr', ['Field'], makeItemForm);
    expect(store.items).toHaveLength(0);
    expect(store.value).toEqual([]);
  });

  test('add appends a new item', () => {
    const store = new ArrayStore('arr', ['Field'], makeItemForm);
    store.add();
    expect(store.items).toHaveLength(1);
    expect(store.contentIsChanged).toBe(true);
  });

  test('remove deletes item at index', () => {
    const store = new ArrayStore('arr', ['Field'], makeItemForm);
    store.add();
    store.add();
    store.remove(0);
    expect(store.items).toHaveLength(1);
  });

  test('setValue replaces items from data', () => {
    const store = new ArrayStore('arr', ['Field'], makeItemForm);
    store.setValue([{ field: 'a' }, { field: 'b' }]);
    expect(store.items).toHaveLength(2);
    expect(store.value).toEqual([{ field: 'a' }, { field: 'b' }]);
    expect(store.contentIsChanged).toBe(false);
  });

  test('isDirty when contentIsChanged', () => {
    const store = new ArrayStore('arr', ['Field'], makeItemForm);
    expect(store.isDirty).toBe(false);
    store.add();
    expect(store.isDirty).toBe(true);
  });

  test('isDirty when child item is dirty', () => {
    const store = new ArrayStore('arr', ['Field'], makeItemForm);
    store.setValue([{ field: 'original' }]);
    (store.items[0].params.field as StringStore).setValue('changed');
    expect(store.isDirty).toBe(true);
  });

  test('hasErrors when child has errors', () => {
    const store = new ArrayStore('arr', ['Field'], () => {
      const form = new FormStore('item');
      form.add('field', new StringStore({
        name: 'Field',
        value: '',
        validator: (v) => v === '' ? 'required' : '',
      }));
      return form;
    });
    store.add();
    expect(store.hasErrors).toBe(true);
  });

  test('submit resets dirty state', () => {
    const store = new ArrayStore('arr', ['Field'], makeItemForm);
    store.add();
    store.submit();
    expect(store.isDirty).toBe(false);
    expect(store.contentIsChanged).toBe(false);
  });

  test('reset clears contentIsChanged', () => {
    const store = new ArrayStore('arr', ['Field'], makeItemForm);
    store.add();
    store.reset();
    expect(store.contentIsChanged).toBe(false);
  });
});
