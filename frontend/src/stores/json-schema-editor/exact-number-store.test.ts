import { ExactNumber } from '@/utils/exact-number';
import { ExactNumberStore } from './exact-number-store';
import { MistypedValue } from './mistyped-value';
import type { JsonSchema } from './types';

const BIG_ID = '36028797018963969'; // 0x80000000000001, rounds to ...970 as a number
// 28-800000000000, String() of it as a number gives ...010
const BIG_W1_ID = '36028797018964008';

const w1Schema: JsonSchema = { type: 'number', format: 'w1-id', options: { show_opt_in: true } };

describe('ExactNumberStore input', () => {
  test('keeps an ordinary number as a number with a plain edit string', () => {
    const store = new ExactNumberStore({ type: 'number' }, 12.5, true);

    expect(store.value).toBe(12.5);
    expect(store.editString).toBe('12.5');
    expect(store.hasErrors).toBe(false);
  });

  test('keeps an integer above 2^53 from the config exactly', () => {
    const store = new ExactNumberStore({ type: 'number' }, ExactNumber.parse(BIG_ID), true);

    expect(store.editString).toBe(BIG_ID);
    expect(JSON.stringify({ id: store.value })).toBe(`{"id":${BIG_ID}}`);
    expect(store.isDirty).toBe(false);
  });

  test('marks text that is not a number as mistyped', () => {
    const store = new ExactNumberStore({ type: 'number' }, 0, true);

    store.setEditString('abc');

    expect(store.value).toBeInstanceOf(MistypedValue);
    expect(store.error).toEqual({ key: 'json-editor.errors.not-a-number' });
  });

  test('an empty input is a required error for an opt-in parameter', () => {
    const store = new ExactNumberStore({ type: 'number', options: { show_opt_in: true } }, 1, false);

    store.setEditString('');

    expect(store.value).toBeUndefined();
    expect(store.error).toEqual({ key: 'json-editor.errors.required' });
  });

  test('a required parameter without a value starts with the default', () => {
    const store = new ExactNumberStore({ type: 'number', default: 7 }, undefined, true);

    expect(store.value).toBe(7);
    expect(store.editString).toBe('7');
  });
});

describe('ExactNumberStore constraints', () => {
  test.each([
    [-1, 'json-editor.errors.minmax'],
    [11, 'json-editor.errors.minmax'],
    [10, undefined],
  ])('value %d with min 0 and max 10 gives error %s', (value, key) => {
    const store = new ExactNumberStore({ type: 'number', minimum: 0, maximum: 10 }, value, true);

    expect(store.error?.key).toBe(key);
  });

  test('an integer above 2^53 is checked against max as a number', () => {
    const store = new ExactNumberStore({ type: 'number', maximum: 2 ** 53 }, ExactNumber.parse(BIG_ID), true);

    expect(store.error?.key).toBe('json-editor.errors.max');
  });

  test('a value outside the enum is an error, a value from the enum is not', () => {
    const store = new ExactNumberStore({ type: 'number', enum: [0, 1] }, 1, true);
    expect(store.hasErrors).toBe(false);

    store.setValue(2);

    expect(store.error).toEqual({ key: 'json-editor.errors.not-in-enum' });
  });

  test('an option picked in the enum dropdown comes as a string and is set as a number', () => {
    const store = new ExactNumberStore({ type: 'number', enum: [0, 1] }, 0, true);

    store.setValue('1');

    expect(store.value).toBe(1);
    expect(store.hasErrors).toBe(false);
    expect(store.isDirty).toBe(true);
  });

  test('a string that is not a number is set as mistyped', () => {
    const store = new ExactNumberStore({ type: 'number' }, 0, true);

    store.setValue('abc');

    expect(store.value).toBeInstanceOf(MistypedValue);
    expect(store.error).toEqual({ key: 'json-editor.errors.not-a-number' });
  });

  test('enum options are built from the enum and its titles', () => {
    const store = new ExactNumberStore(
      { type: 'number', enum: [0, 1], options: { enum_titles: ['Off', 'On'] } },
      0,
      true,
    );

    expect(store.enumOptions).toEqual([{ label: 'Off', value: 0 }, { label: 'On', value: 1 }]);
  });

  test('a value from registers with an error is hidden in the editor', () => {
    const store = new ExactNumberStore({ type: 'number', enum: [0, 1] }, 0, true);
    store.setDoNotShowInvalidValue(true);

    store.setValue(5);

    expect(store.hasErrors).toBe(true);
    expect(store.editString).toBe('');
  });
});

describe('ExactNumberStore default and dirty state', () => {
  test('setDefault sets the schema default', () => {
    const store = new ExactNumberStore({ type: 'number', default: 3 }, 5, true);

    store.setDefault();

    expect(store.value).toBe(3);
    expect(store.isDirty).toBe(true);
  });

  test('setting a value equal to the initial one is not dirty, commit and reset follow it', () => {
    const store = new ExactNumberStore({ type: 'number' }, ExactNumber.parse(BIG_ID), true);

    store.setValue(ExactNumber.parse(BIG_ID));
    expect(store.isDirty).toBe(false);

    store.setEditString('5');
    expect(store.isDirty).toBe(true);

    store.reset();
    expect(store.isDirty).toBe(false);
    expect(String(store.value)).toBe(BIG_ID);

    store.setEditString('5');
    store.commit();
    expect(store.isDirty).toBe(false);
    expect(store.value).toBe(5);
  });

  test('an exactly held integer above 2^53 is equal to the same ID as a number', () => {
    const store = new ExactNumberStore({ type: 'number' }, ExactNumber.parse(String(2 ** 54)), true);

    store.setValue(2 ** 54);

    expect(store.isDirty).toBe(false);
  });

  test('typing the initial value again is dirty when any user input is dirty', () => {
    const store = new ExactNumberStore({ type: 'number' }, 5, true);
    store.setAnyUserInputIsDirty(true);

    store.setEditString('5');

    expect(store.isDirty).toBe(true);
  });
});

describe('ExactNumberStore with the w1-id format', () => {
  test('shows an ID above 2^53 from the config in 1-Wire format and keeps it exact', () => {
    const store = new ExactNumberStore(w1Schema, ExactNumber.parse(BIG_W1_ID), false);

    expect(store.editString).toBe('28-800000000000');
    expect(store.hasErrors).toBe(false);
    expect(String(store.value)).toBe(BIG_W1_ID);
  });

  test('a typed 1-Wire ID above 2^53 is saved with exactly its digits', () => {
    const store = new ExactNumberStore(w1Schema, 0, false);

    store.setEditString('28-800000000000');

    expect(store.hasErrors).toBe(false);
    expect(JSON.stringify(store.value)).toBe(BIG_W1_ID);
  });

  test('a typed 1-Wire ID a number holds is a number', () => {
    const store = new ExactNumberStore(w1Schema, 0, false);

    store.setEditString('28-00000000000a');

    expect(store.value).toBe(0x0a28);
  });

  test.each(['28-12345', '28-zzzzzzzzzzzz', 'abc'])('a mistyped ID %s gives the 1-Wire format error', (text) => {
    const store = new ExactNumberStore(w1Schema, 0, false);

    store.setEditString(text);

    expect(store.error).toEqual({ key: 'json-editor.errors.invalid-1-wire-format' });
  });

  test('an empty input is the zero ID', () => {
    const store = new ExactNumberStore(w1Schema, 0x0a28, false);

    store.setEditString('');

    expect(store.value).toBe(0);
    expect(store.editString).toBe('0');
    expect(store.hasErrors).toBe(false);
  });
});
