import { NumberStore } from './number-store';

vi.mock('@/i18n/config', () => (
  { default: { t: vi.fn((key: string, opts?: any) => opts ? `${key}:${JSON.stringify(opts)}` : key) } }
));

describe('NumberStore', () => {
  test('initializes with value and tracks initialValue', () => {
    const store = new NumberStore({ name: 'n', value: 10 });
    expect(store.value).toBe(10);
    expect(store.initialValue).toBe(10);
  });

  test('setValue parses float for number type', () => {
    const store = new NumberStore({ name: 'n' });
    store.setValue('3.14');
    expect(store.value).toBe(3.14);
  });

  test('setValue parses int for integer type', () => {
    const store = new NumberStore({ type: 'integer', name: 'n' });
    store.setValue('3.9');
    expect(store.value).toBe(3);
  });

  test('setValue keeps NaN-producing input as-is', () => {
    const store = new NumberStore({ name: 'n' });
    store.setValue('abc');
    expect(store.value).toBe('abc');
  });

  test('setValue with undefined sets undefined', () => {
    const store = new NumberStore({ name: 'n', value: 5 });
    store.setValue(undefined);
    expect(store.value).toBeUndefined();
  });

  describe('hasErrors', () => {
    test('no error for valid number in range', () => {
      const store = new NumberStore({ name: 'n', value: 5, min: 0, max: 10, strict: true });
      expect(store.hasErrors).toBe(false);
    });

    test('error when value below min', () => {
      const store = new NumberStore({ name: 'n', value: -1, min: 0, strict: true });
      expect(store.hasErrors).toBe(true);
    });

    test('error when value above max', () => {
      const store = new NumberStore({ name: 'n', value: 11, max: 10, strict: true });
      expect(store.hasErrors).toBe(true);
    });

    test('error when integer type has float value', () => {
      const store = new NumberStore({ type: 'integer', name: 'n', value: 3.5, strict: true });
      expect(store.hasErrors).toBe(true);
    });

    test('error when number type gets non-number', () => {
      const store = new NumberStore({ name: 'n', strict: true });
      store.setValue('abc');
      expect(store.hasErrors).toBe(true);
    });

    test('no error when not strict and value undefined', () => {
      const store = new NumberStore({ name: 'n', min: 0 });
      store.setValue(undefined);
      expect(store.hasErrors).toBe(false);
    });

    test('customError takes precedence', () => {
      const store = new NumberStore({ name: 'n', value: 5 });
      store.setCustomError('custom');
      expect(store.hasErrors).toBe(true);
      expect(store.error).toBe('custom');
    });
  });

  test('error message includes min/max context', () => {
    const store = new NumberStore({ name: 'n', min: 0, max: 100, value: -1, strict: true });
    expect(store.error).toContain('editors.errors.number');
  });

  test('isDirty tracks changes', () => {
    const store = new NumberStore({ name: 'n', value: 5 });
    expect(store.isDirty).toBe(false);
    store.setValue(10);
    expect(store.isDirty).toBe(true);
  });

  test('submit saves current as initial', () => {
    const store = new NumberStore({ name: 'n', value: 5 });
    store.setValue(10);
    store.submit();
    expect(store.isDirty).toBe(false);
  });

  test('reset reverts to initial', () => {
    const store = new NumberStore({ name: 'n', value: 5 });
    store.setValue(99);
    store.reset();
    expect(store.value).toBe(5);
  });

  test('setStrict changes strict flag', () => {
    const store = new NumberStore({ name: 'n' });
    store.setStrict(true);
    expect(store.strict).toBe(true);
  });

  test('setDefaultText changes defaultText', () => {
    const store = new NumberStore({ name: 'n' });
    store.setDefaultText('N/A');
    expect(store.defaultText).toBe('N/A');
  });
});
