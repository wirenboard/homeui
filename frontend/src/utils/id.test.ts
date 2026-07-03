import { generateNextId } from './id';

describe('generateNextId', () => {
  test('returns base + 1 when no items', () => {
    expect(generateNextId([], 'rule')).toBe('rule1');
  });

  test('increments highest numeric suffix', () => {
    expect(generateNextId(['rule1', 'rule2', 'rule3'], 'rule')).toBe('rule4');
  });

  test('ignores items not starting with base', () => {
    expect(generateNextId(['other1', 'other2'], 'rule')).toBe('rule1');
  });

  test('ignores non-numeric suffixes', () => {
    expect(generateNextId(['rule_a', 'rulefoo'], 'rule')).toBe('rule1');
  });

  test('handles gaps in numbering', () => {
    expect(generateNextId(['rule1', 'rule5'], 'rule')).toBe('rule6');
  });

  test('handles mixed matching and non-matching items', () => {
    expect(generateNextId(['rule1', 'other2', 'rule3'], 'rule')).toBe('rule4');
  });

  test('handles base with special characters', () => {
    expect(generateNextId(['my-rule1', 'my-rule2'], 'my-rule')).toBe('my-rule3');
  });
});
