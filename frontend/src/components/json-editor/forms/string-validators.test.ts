import { makeNotEmptyValidator, makeMinLengthValidator } from './string-validators';

vi.mock('@/i18n/config', () => (
  { default: { t: vi.fn((key: string, opts?: any) => opts ? `${key}:${JSON.stringify(opts)}` : key) } }
));

describe('makeNotEmptyValidator', () => {
  test('returns error for empty string', () => {
    const validate = makeNotEmptyValidator(null);
    expect(validate('')).toBe('validator.errors.empty');
  });

  test('returns custom error for empty string', () => {
    const validate = makeNotEmptyValidator('required');
    expect(validate('')).toBe('required');
  });

  test('returns null for non-empty string', () => {
    const validate = makeNotEmptyValidator(null);
    expect(validate('hello')).toBeNull();
  });
});

describe('makeMinLengthValidator', () => {
  test('returns error for string shorter than min', () => {
    const validate = makeMinLengthValidator(5);
    expect(validate('ab')).toContain('validator.errors.min-length');
  });

  test('returns error for empty string', () => {
    const validate = makeMinLengthValidator(1);
    expect(validate('')).toContain('validator.errors.min-length');
  });

  test('returns null for string at min length', () => {
    const validate = makeMinLengthValidator(3);
    expect(validate('abc')).toBeNull();
  });

  test('returns null for string longer than min', () => {
    const validate = makeMinLengthValidator(2);
    expect(validate('hello')).toBeNull();
  });
});
