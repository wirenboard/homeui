import type { MatterDevice } from '@/stores/matter';
import { configuratorSelection, groupManualCode, timeLeft } from './utils';

describe('groupManualCode', () => {
  it('groups the short code the way the apps print it', () => {
    expect(groupManualCode('23331712339')).toBe('2333-171-2339');
  });

  it('leaves a code of another length alone', () => {
    // A code that carries a vendor and a product id is longer and grouped differently,
    // so splitting it by this rule would print it wrong.
    expect(groupManualCode('641286075300001000016')).toBe('641286075300001000016');
    expect(groupManualCode('')).toBe('');
  });
});

describe('configuratorSelection', () => {
  const device = (fields: Partial<MatterDevice>) => ({
    did: 10,
    name: 'Kitchen light',
    type: 'switch',
    module: 'wb-mr6c_21',
    area: null,
    roles: ['on_off'],
    exposed: true,
    reason_code: null,
    reason: null,
    state: 'on' as const,
    ...fields,
  });

  it('is the card the configurator groups this module under', () => {
    expect(configuratorSelection(device({}))).toEqual({ id: 'module:wb-mr6c_21' });
  });

  it('is the module and nothing else', () => {
    // The configurator groups the devices of the config by module alone: which controls
    // a device reads does not change the card it belongs to.
    expect(configuratorSelection(device({ module: 'Boiler' }))).toEqual({ id: 'module:Boiler' });
  });

  it('is nothing when the device has no module to open', () => {
    expect(configuratorSelection(device({ module: null }))).toBe(null);
  });
});

describe('timeLeft', () => {
  it('counts down in minutes and seconds', () => {
    expect(timeLeft(1000 * 905, 1000 * 5)).toBe('15:00');
    expect(timeLeft(1000 * 69, 1000 * 5)).toBe('1:04');
    expect(timeLeft(1000 * 9, 1000 * 5)).toBe('0:04');
  });

  it('reads zero for a window whose time is up', () => {
    // The page polls every few seconds, so the clock runs out before the bridge says
    // the window is gone. A negative countdown in that gap would look like a bug.
    expect(timeLeft(1000, 60000)).toBe('0:00');
  });
});
