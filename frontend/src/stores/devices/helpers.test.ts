import { isTopicsAreEqual, splitTopic } from './helpers';

describe('splitTopic', () => {
  test('extracts deviceId and cellId', () => {
    expect(splitTopic('/devices/lamp/controls/brightness')).toEqual({
      deviceId: 'lamp',
      cellId: 'lamp/brightness',
    });
  });

  test('handles meta topics', () => {
    expect(splitTopic('/devices/lamp/controls/brightness/meta/type')).toEqual({
      deviceId: 'lamp',
      cellId: 'lamp/brightness',
    });
  });
});

describe('isTopicsAreEqual', () => {
  test('matches exact topic', () => {
    expect(isTopicsAreEqual('/devices/lamp/meta', '/devices/lamp/meta')).toBe(true);
  });

  test('matches + wildcard for single level', () => {
    expect(isTopicsAreEqual('/devices/lamp/meta', '/devices/+/meta')).toBe(true);
  });

  test('matches # wildcard for remaining levels', () => {
    expect(isTopicsAreEqual('/devices/lamp/controls/brightness/meta/type', '/devices/+/controls/#')).toBe(true);
  });

  test('rejects non-matching topic', () => {
    expect(isTopicsAreEqual('/devices/lamp/meta/name', '/devices/+/meta/type')).toBe(false);
  });
});
