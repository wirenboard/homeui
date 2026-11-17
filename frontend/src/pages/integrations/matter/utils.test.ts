import { type TFunction } from 'i18next';
import type { MatterDevice, MatterFabric } from '@/stores/matter';
import { LinkState, PairedDateKind } from './types';
import {
  appDisplayName, configuratorSelection, detailParts, groupManualCode, isColour, linkState,
  pairedDateKind, timeLeft, vendorHex,
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

describe('what the bridge shows beside the state', () => {
  it('splits the readings the way the service joined them', () => {
    expect(detailParts({ detail: '50 % · #FF0000' } as any)).toEqual(['50 %', '#FF0000']);
    expect(detailParts({ detail: '3000 K' } as any)).toEqual(['3000 K']);
  });

  it('says nothing when there is nothing to add, including from an older service', () => {
    expect(detailParts({ detail: null } as any)).toEqual([]);
    expect(detailParts({} as any)).toEqual([]);
  });

  it('knows a colour from a number, because only a colour gets a swatch', () => {
    expect(isColour('#FF0000')).toBe(true);
    expect(isColour('#0080FF')).toBe(true);
    expect(isColour('50 %')).toBe(false);
    expect(isColour('3000 K')).toBe(false);
    // Lower case is not what the bridge sends, and guessing would draw a swatch for
    // something that is not a colour.
    expect(isColour('#ff0000')).toBe(false);
  });
});

describe('the vendor id as it is written down', () => {
  it('is hex, padded, upper case, the way every Matter document writes it', () => {
    expect(vendorHex(4911)).toBe('0x132F');
    expect(vendorHex(1)).toBe('0x0001');
    expect(vendorHex(0xFFF1)).toBe('0xFFF1');
  });
});

describe('what to call a connected app', () => {
  // Returns the key, like the i18n mock of the page tests, so a test can tell which of
  // the fallbacks was taken.
  const t = ((key: string) => key) as TFunction;
  const fabric = (over: Partial<MatterFabric>): MatterFabric => (
    { index: 1, label: '', vendor_id: 4911, ...over }
  );

  it('prefers the name typed on this controller over everything else', () => {
    expect(appDisplayName(fabric({ alias: 'Hall phone', label: 'Yandex' }), t)).toBe('Hall phone');
  });

  it('takes the label when there is no name of ours', () => {
    expect(appDisplayName(fabric({ label: 'Home Assistant' }), t)).toBe('Home Assistant');
  });

  it('falls back to a vendor it recognises', () => {
    expect(appDisplayName(fabric({ vendor_id: 4911 }), t)).toBe('matter.labels.vendor-yandex');
  });

  it('names an app that gave nothing by its fabric number, which is all it has', () => {
    // Two such apps have to be tellable apart, or the operator cannot know which one to
    // remove. Four of nine on our own stand were in this state.
    expect(appDisplayName(fabric({ index: 15, vendor_id: 0x1037 }), t)).toBe('matter.labels.app-unnamed');
  });
});

describe('when an app paired', () => {
  it('is a date of its own when the bridge wrote one down', () => {
    expect(pairedDateKind({ paired_at: 1_700_000_000_000 } as MatterFabric, 1)).toBe(PairedDateKind.Dated);
  });

  it('is "before" for an app already paired when the bridge started keeping dates', () => {
    // Not a blank: the bridge genuinely does not know the day, and a gap reads like a
    // defect rather than like an honest answer.
    expect(pairedDateKind({} as MatterFabric, 1_700_000_000_000)).toBe(PairedDateKind.Before);
  });

  it('is unknown when there is no date and no moment to measure from', () => {
    expect(pairedDateKind({} as MatterFabric, null)).toBe(PairedDateKind.Unknown);
    expect(pairedDateKind({} as MatterFabric, undefined)).toBe(PairedDateKind.Unknown);
  });
});

describe('whether an app is on the line', () => {
  it('is online whenever the bridge says a channel is open', () => {
    expect(linkState({ online: true } as MatterFabric)).toBe(LinkState.Online);
  });

  it('is quiet only when there is also a moment the channel went away', () => {
    expect(linkState({ online: false, last_seen: 1_700_000_000_000 } as MatterFabric))
      .toBe(LinkState.Quiet);
  });

  it('is plain offline with no time, which is the usual case after a restart', () => {
    // last_seen is written on the break and kept in memory until then, so a service that
    // has just started has none for anybody.
    expect(linkState({ online: false } as MatterFabric)).toBe(LinkState.Offline);
    expect(linkState({} as MatterFabric)).toBe(LinkState.Offline);
  });

  it('ignores a stale time while a channel is open', () => {
    expect(linkState({ online: true, last_seen: 1 } as MatterFabric)).toBe(LinkState.Online);
  });
});
