import { OptionsStore, getFirstOptionValue } from './options-store';

describe('getFirstOptionValue', () => {
  test('returns first value from flat options', () => {
    expect(getFirstOptionValue([{ value: 'a' }, { value: 'b' }])).toBe('a');
  });

  test('returns first value from grouped options', () => {
    expect(getFirstOptionValue([{ options: [{ value: 'nested' }] }])).toBe('nested');
  });

  test('returns undefined for empty array', () => {
    expect(getFirstOptionValue([])).toBeUndefined();
  });

  test('returns undefined for undefined', () => {
    expect(getFirstOptionValue(undefined)).toBeUndefined();
  });
});

describe('OptionsStore', () => {
  const options = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' },
  ];

  test('initializes and selects matching option', () => {
    const store = new OptionsStore({ name: 'sel', value: 'b', options });
    expect(store.value).toBe('b');
    expect(store.selectedOption).toEqual({ value: 'b', label: 'B' });
  });

  test('setValue updates value and selectedOption', () => {
    const store = new OptionsStore({ name: 'sel', value: 'a', options });
    store.setValue('c');
    expect(store.value).toBe('c');
    expect(store.selectedOption.label).toBe('C');
  });

  test('setValue with unknown value in grouped options clears selectedOption', () => {
    const grouped = [
      { label: 'Group', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
    ];
    const store = new OptionsStore({ name: 'sel', value: 'a', options: grouped, strict: true });
    store.setValue('unknown');
    expect(store.selectedOption).toBeUndefined();
    expect(store.hasErrors).toBe(true);
  });

  test('setValue with unknown value has no error in non-strict mode', () => {
    const grouped = [
      { label: 'Group', options: [{ value: 'a', label: 'A' }] },
    ];
    const store = new OptionsStore({ name: 'sel', value: 'a', options: grouped, strict: false });
    store.setValue('unknown');
    expect(store.hasErrors).toBe(false);
  });

  test('grouped options are searched correctly', () => {
    const grouped = [
      { label: 'Group', options: [{ value: 'g1', label: 'G1' }, { value: 'g2', label: 'G2' }] },
    ];
    const store = new OptionsStore({ name: 'sel', value: 'g2', options: grouped });
    expect(store.selectedOption).toEqual({ value: 'g2', label: 'G2' });
  });

  test('setSelectedOption updates value', () => {
    const store = new OptionsStore({ name: 'sel', value: 'a', options });
    store.setSelectedOption({ value: 'c', label: 'C' });
    expect(store.value).toBe('c');
  });

  test('setSelectedOption with null clears value', () => {
    const store = new OptionsStore({ name: 'sel', value: 'a', options });
    store.setSelectedOption(null);
    expect(store.value).toBeNull();
  });

  test('setOptions replaces options and re-validates with grouped', () => {
    const grouped = [{ label: 'G', options: [{ value: 'a', label: 'A' }] }];
    const store = new OptionsStore({ name: 'sel', value: 'a', options: grouped, strict: true });
    store.setOptions([{ label: 'G', options: [{ value: 'x', label: 'X' }] }]);
    expect(store.hasErrors).toBe(true);
  });

  test('addOption appends to list', () => {
    const store = new OptionsStore({ name: 'sel', value: 'a', options: [...options] });
    store.addOption({ value: 'd', label: 'D' });
    expect(store.options).toHaveLength(4);
  });

  test('isDirty tracks changes from initial', () => {
    const store = new OptionsStore({ name: 'sel', value: 'a', options });
    expect(store.isDirty).toBe(false);
    store.setValue('b');
    expect(store.isDirty).toBe(true);
  });

  test('submit saves current as initial', () => {
    const store = new OptionsStore({ name: 'sel', value: 'a', options });
    store.setValue('b');
    store.submit();
    expect(store.isDirty).toBe(false);
  });

  test('reset reverts to initial value', () => {
    const store = new OptionsStore({ name: 'sel', value: 'a', options });
    store.setValue('c');
    store.reset();
    expect(store.value).toBe('a');
  });
});
