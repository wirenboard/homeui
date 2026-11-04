import type { MatterDevice } from '@/stores/matter';
import { configuratorSelection, groupManualCode } from './utils';

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
    sources: ['wb-mr6c_21'],
    exposed: true,
    reason_code: null,
    reason: null,
    state: 'on' as const,
    ...fields,
  });

  it('is the WB card when every service reads that same module', () => {
    expect(configuratorSelection(device({}))).toEqual({ kind: 'wb', id: 'wb-mr6c_21' });
  });

  it('is a device of its own when the services read something else', () => {
    // The configurator keeps a device under a WB module only when the module is the one
    // its services read; anything else is a device composed by hand.
    expect(configuratorSelection(device({ module: 'Boiler', sources: ['wb-m1w2_15'] })))
      .toEqual({ kind: 'own', id: 'own:Boiler' });
  });

  it('is a device of its own when the services read several modules', () => {
    expect(configuratorSelection(device({ sources: ['wb-mr6c_21', 'wb-led_33'] })))
      .toEqual({ kind: 'own', id: 'own:wb-mr6c_21' });
  });

  it('is nothing when the device has no module to open', () => {
    expect(configuratorSelection(device({ module: null }))).toBe(null);
  });
});
