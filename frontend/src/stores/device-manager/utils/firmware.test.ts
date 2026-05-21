import { firmwareIsNewer, firmwareIsNewerOrEqual } from './firmware';

describe('Firmware version comparison', () => {
  describe.each([
    { fw1: '1.2.3', fw2: '1.2.3', expected: false },
    { fw1: '1.2.3', fw2: '1.2.4', expected: true },
    { fw1: '1.2.3', fw2: '1.2.30', expected: true },
    { fw1: '1.2.3', fw2: '1.3.3', expected: true },
    { fw1: '1.2.3-rc1', fw2: '1.2.3', expected: true },
    { fw1: '1.2.3-rc10', fw2: '1.2.3-rc1', expected: false },
    { fw1: '1.2.3+wb1', fw2: '1.2.3', expected: false },
    { fw1: '1.2.3+wb1', fw2: '1.2.3+wb10', expected: true },
    { fw1: '1.2.3-rc1', fw2: '1.2.3+wb10', expected: true },
  ])('firmwareIsNewer($fw1, $fw2)', ({ fw1, fw2, expected }) => {
    test(`returns ${expected}`, () => {
      expect(firmwareIsNewer(fw1, fw2)).toBe(expected);
    });
  });

  describe.each([
    { fw1: '1.2.3', fw2: '1.2.3', expected: true },
    { fw1: '1.2.3', fw2: '1.2.4', expected: true },
    { fw1: '1.2.3', fw2: '1.2.30', expected: true },
    { fw1: '1.2.3', fw2: '1.3.3', expected: true },
    { fw1: '1.2.4', fw2: '1.2.3', expected: false },
    { fw1: '1.2.3-rc1', fw2: '1.2.3', expected: true },
    { fw1: '1.2.3-rc10', fw2: '1.2.3-rc1', expected: false },
    { fw1: '1.2.3-rc1', fw2: '1.2.3-rc1', expected: true },
    { fw1: '1.2.3+wb1', fw2: '1.2.3', expected: false },
    { fw1: '1.2.3+wb1', fw2: '1.2.3+wb10', expected: true },
    { fw1: '1.2.3+wb1', fw2: '1.2.3+wb1', expected: true },
    { fw1: '1.2.3-rc1', fw2: '1.2.3+wb10', expected: true },
    { fw1: undefined, fw2: undefined, expected: true },
    { fw1: undefined, fw2: '1.2.3', expected: true },
    { fw1: '1.2.3', fw2: undefined, expected: false },
  ])('firmwareIsNewerOrEqual($fw1, $fw2)', ({ fw1, fw2, expected }) => {
    test(`returns ${expected}`, () => {
      expect(firmwareIsNewerOrEqual(fw1, fw2)).toBe(expected);
    });
  });
});
