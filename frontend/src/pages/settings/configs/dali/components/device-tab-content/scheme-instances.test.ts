// @vitest-environment happy-dom
import { ATTRIBUTABLE_EVENT_SCHEME, wrongSchemeInstances } from './device-tab-content';

vi.mock('@/services', () => import('@/test/mocks/services'));

describe('wrongSchemeInstances: which instanceN blocks need the event-scheme fix', () => {
  it('flags instances whose scheme cannot attribute events, and only those', () => {
    expect(wrongSchemeInstances({
      instance0: { event_scheme: 0 },
      instance1: { event_scheme: ATTRIBUTABLE_EVENT_SCHEME },
      instance12: { event_scheme: 4 },
    })).toEqual(['instance0', 'instance12']);
  });

  it('ignores non-instance keys, missing and non-numeric schemes', () => {
    expect(wrongSchemeInstances({
      name: 'lamp',
      instanceX: { event_scheme: 0 },
      instance2: {},
      instance3: { event_scheme: 'weird' },
      feedback: { event_scheme: 0 },
    })).toEqual([]);
  });

  it('tolerates an absent config', () => {
    expect(wrongSchemeInstances(undefined)).toEqual([]);
  });
});
