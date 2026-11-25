import { type TFunction } from 'i18next';
import type { MatterDevice, MatterFabric } from '@/stores/matter';
import {
  configuratorSelection, fabricDisplayLabel, groupManualCode, replacedLabelText, timeLeft, vendorHex,
} from './utils';

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

describe('the vendor id as it is written down', () => {
  it('is hex, padded, upper case, the way every Matter document writes it', () => {
    expect(vendorHex(4911)).toBe('0x132F');
    expect(vendorHex(1)).toBe('0x0001');
    expect(vendorHex(0xFFF1)).toBe('0xFFF1');
  });
});

describe('the label of a fabric in words', () => {
  // Returns the key, like the i18n mock of the page tests; a default value wins over it,
  // as in i18next when there is no translation.
  const t = ((key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key) as TFunction;
  const fabric = (over: Partial<MatterFabric>): MatterFabric => (
    { index: 7, adminFabricLabel: '', vendor_id: 4911, ...over }
  );

  it('is the text the bridge chose, for a label typed here and for one the fabric gave itself', () => {
    expect(fabricDisplayLabel(fabric({ label: { source: 'admin', text: 'Home' } }), t)).toBe('Home');
    expect(fabricDisplayLabel(
      fabric({ label: { source: 'local', text: 'Hall', replaced: { source: 'admin', text: 'Home' } } }),
      t,
    )).toBe('Hall');
  });

  it('asks the translations for a vendor by its number, and falls back to the name the bridge gave', () => {
    const asked: string[] = [];
    const spy = ((key: string, options?: { defaultValue?: string }) => {
      asked.push(key);
      return options?.defaultValue ?? key;
    }) as TFunction;

    expect(fabricDisplayLabel(fabric({ label: { source: 'vendor', text: 'Yandex' } }), spy)).toBe('Yandex');
    expect(asked).toEqual(['matter.labels.vendor-4911']);
  });

  it('is the number for a fabric that offers nothing, and for a bridge that sends no label', () => {
    expect(fabricDisplayLabel(fabric({ label: { source: 'none', text: null } }), t))
      .toBe('matter.labels.fabric-unlabelled');
    expect(fabricDisplayLabel(fabric({}), t)).toBe('matter.labels.fabric-unlabelled');
  });

  it('says what a label typed here replaced: the label of the app, or that there was none', () => {
    const over = (replaced: unknown) => fabric({ label: { source: 'local', text: 'Hall', replaced } as any });

    expect(replacedLabelText(over({ source: 'admin', text: 'Home' }), t)).toBe('Home');
    expect(replacedLabelText(over({ source: 'none', text: null }), t)).toBe('matter.labels.none');
    // Nothing was typed here, so nothing was replaced.
    expect(replacedLabelText(fabric({ label: { source: 'admin', text: 'Home' } }), t)).toBeNull();
  });
});
