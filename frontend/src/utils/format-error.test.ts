import { formatError } from './format-error';

describe('formatError', () => {
  test('formats RPC error with object data', () => {
    const error = { code: -32000, message: 'RPC failed', data: { message: 'details' } };
    expect(formatError(error)).toBe('RPC failed: details(-32000)');
  });

  test('formats RPC error with string data', () => {
    const error = { code: -32000, message: 'RPC failed', data: 'some data' };
    expect(formatError(error)).toBe('RPC failed: some data(-32000)');
  });

  test('formats object error without code', () => {
    const error = { message: 'just a message' };
    expect(formatError(error)).toBe('just a message');
  });

  test('returns empty string for object without message or code', () => {
    expect(formatError({})).toBe('');
  });

  test('formats non-object error as string', () => {
    expect(formatError('string error')).toBe('string error');
    expect(formatError(42)).toBe('42');
  });

  test('handles null data in RPC error', () => {
    const error = { code: -1, message: 'err', data: null };
    expect(formatError(error)).toBe('err: null(-1)');
  });
});
