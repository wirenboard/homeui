// @vitest-environment happy-dom
import type { JsonSchema } from '@/stores/json-schema-editor';
import type { WbDeviceTemplateParameter } from '../../types';
import { DeviceSettingsObjectStore } from './device-settings-store';

// Minimal device schema: one common param plus the template parameters under test.
const makeStore = (parameters: WbDeviceTemplateParameter[], userConfig = {}) =>
  new DeviceSettingsObjectStore(
    {
      type: 'object',
      properties: { slave_id: { type: 'string' } },
      device: { parameters },
    } as unknown as JsonSchema,
    userConfig,
  );

const getParam = (store: DeviceSettingsObjectStore, id: string) =>
  store.topLevelGroup.parameters.find((param) => param.id === id);

const getActiveStore = (store: DeviceSettingsObjectStore, id: string) => {
  const param = getParam(store, id);
  return param.variants[param.activeVariantIndex].store;
};

// A chain of fw variants: the base declaration without fw and its extension since fw 2.2.0.
const fwChain: WbDeviceTemplateParameter[] = [
  { id: 'p1', title: 'P1', enum: [0, 1], default: 0 },
  { id: 'p1', title: 'P1', enum: [0, 1, 2], default: 0, fw: '2.2.0' },
];

describe('DeviceSettingsObjectStore with a chain of fw variants (base + fw 2.2.0)', () => {
  it('shows the newest variant with three enum values while the device firmware is unknown', () => {
    const store = makeStore(fwChain);
    const param = getParam(store, 'p1');

    expect(param.activeVariantIndex).toBe(1);
    expect(getActiveStore(store, 'p1').schema.enum).toEqual([0, 1, 2]);
    expect(param.hasConflictingVariants).toBe(false);
    expect(param.isSupportedByFirmware).toBe(true);
    expect(param.supportedFirmware).toBeUndefined();
  });

  it('shows the base variant with two enum values when the device firmware 2.1.0 is older than the extension', () => {
    const store = makeStore(fwChain);

    store.setFromDeviceRegisters({ p1: 0 }, '2.1.0');

    const param = getParam(store, 'p1');
    expect(param.activeVariantIndex).toBe(0);
    expect(getActiveStore(store, 'p1').schema.enum).toEqual([0, 1]);
    expect(param.isSupportedByFirmware).toBe(true);
    expect(param.hasConflictingVariants).toBe(false);
  });

  it.each(['2.2.0', '3.0.0'])('shows the newest variant when the device firmware is %s', (fw) => {
    const store = makeStore(fwChain);

    store.setFromDeviceRegisters({ p1: 0 }, fw);

    expect(getParam(store, 'p1').activeVariantIndex).toBe(1);
    expect(getActiveStore(store, 'p1').schema.enum).toEqual([0, 1, 2]);
  });

  it('treats the value 2 read from a device with firmware 2.1.0 as a bad value from registers', () => {
    const store = makeStore(fwChain);

    store.setFromDeviceRegisters({ p1: 2 }, '2.1.0');

    expect(getActiveStore(store, 'p1').value).toBe(2);
    expect(getParam(store, 'p1').hasBadValueFromRegisters).toBe(true);
    expect(store.hasBadValuesFromRegisters).toBe(true);
  });

  it('accepts the value 2 read from a device with firmware 2.2.0', () => {
    const store = makeStore(fwChain);

    store.setFromDeviceRegisters({ p1: 2 }, '2.2.0');

    expect(getActiveStore(store, 'p1').value).toBe(2);
    expect(getParam(store, 'p1').hasBadValueFromRegisters).toBe(false);
    expect(getParam(store, 'p1').hasErrors).toBe(false);
    expect(store.value.p1).toBe(2);
  });

  it('switches to the extended variant and accepts the value 2 when a re-read after an update reports 2.2.0', () => {
    const store = makeStore(fwChain);
    const param = getParam(store, 'p1');
    store.setFromDeviceRegisters({ p1: 1 }, '2.1.0');
    expect(param.activeVariantIndex).toBe(0);

    store.setFromDeviceRegisters({ p1: 2 }, '2.2.0');

    expect(param.activeVariantIndex).toBe(1);
    expect(param.value).toBe(2);
    expect(param.hasBadValueFromRegisters).toBe(false);
    expect(store.value.p1).toBe(2);
  });

  it('reports a bad value from registers when a re-read on 2.1.0 returns the value 2 accepted on 2.2.0', () => {
    const store = makeStore(fwChain);
    const param = getParam(store, 'p1');
    store.setFromDeviceRegisters({ p1: 2 }, '2.2.0');
    expect(param.hasBadValueFromRegisters).toBe(false);

    store.setFromDeviceRegisters({ p1: 2 }, '2.1.0');

    expect(param.activeVariantIndex).toBe(0);
    expect(param.hasBadValueFromRegisters).toBe(true);
  });

  it('keeps a user config value from the extended enum without errors while the firmware is unknown', () => {
    const store = makeStore(fwChain, { p1: 2 });

    expect(getParam(store, 'p1').hasErrors).toBe(false);
    expect(getParam(store, 'p1').value).toBe(2);
    expect(store.value.p1).toBe(2);
  });

  it('shows an error and drops on save a user config value outside the enum of the base variant on 2.1.0', () => {
    const store = makeStore(fwChain, { p1: 2 });

    store.setFromDeviceRegisters({ p1: 0 }, '2.1.0');

    const param = getParam(store, 'p1');
    expect(param.activeVariantIndex).toBe(0);
    expect(param.hasErrors).toBe(true);
    expect(param.shouldStoreInConfig).toBe(false);
    expect(store.value).not.toHaveProperty('p1');
  });

  it('disables the parameter without a "supported since" hint when the device reports the unsupported marker', () => {
    const store = makeStore(fwChain);

    store.setFromDeviceRegisters({ p1: 'unsupported' }, '2.2.0');

    expect(getParam(store, 'p1').isSupportedByFirmware).toBe(false);
    expect(getParam(store, 'p1').supportedFirmware).toBeUndefined();
  });
});

describe('DeviceSettingsObjectStore with a chain of fw variants declared newest first (fw 2.2.0 + base)', () => {
  const reversedFwChain: WbDeviceTemplateParameter[] = [
    { id: 'p1', title: 'P1', enum: [0, 1, 2], default: 0, fw: '2.2.0' },
    { id: 'p1', title: 'P1', enum: [0, 1], default: 0 },
  ];

  it('shows the fw 2.2.0 variant declared first while the device firmware is unknown', () => {
    expect(getParam(makeStore(reversedFwChain), 'p1').activeVariantIndex).toBe(0);
  });

  it.each([
    { fw: '2.2.0', index: 0 },
    { fw: '2.1.0', index: 1 },
  ])('shows the variant at index $index when the device firmware is $fw', ({ fw, index }) => {
    const store = makeStore(reversedFwChain);

    store.setFromDeviceRegisters({ p1: 0 }, fw);

    expect(getParam(store, 'p1').activeVariantIndex).toBe(index);
  });
});

describe('DeviceSettingsObjectStore with a chain of fw variants (fw 1.0 + fw 2.0) on an older device', () => {
  it('marks the parameter unsupported and reports the lowest fw of the chain when the device firmware is 0.9', () => {
    const store = makeStore([
      { id: 'p1', title: 'P1', enum: [0, 1], default: 0, fw: '1.0' },
      { id: 'p1', title: 'P1', enum: [0, 1, 2], default: 0, fw: '2.0' },
    ]);

    store.setFromDeviceRegisters({}, '0.9');

    const param = getParam(store, 'p1');
    expect(param.isSupportedByFirmware).toBe(false);
    expect(param.supportedFirmware).toBe('1.0');
    expect(param.activeVariantIndex).toBe(0);
  });
});

describe('DeviceSettingsObjectStore when the daemon omitted the firmware version from the read registers', () => {
  it('keeps a single declaration with fw 1.0 unsupported, shows its device value and does not save it', () => {
    const store = makeStore([{ id: 'p1', title: 'P1', enum: [0, 1], default: 0, fw: '1.0' }]);

    store.setFromDeviceRegisters({ p1: 1 }, undefined);

    const param = getParam(store, 'p1');
    expect(param.isSupportedByFirmware).toBe(false);
    expect(param.supportedFirmware).toBe('1.0');
    expect(param.value).toBe(1);
    expect(param.shouldStoreInConfig).toBe(false);
    expect(store.value).not.toHaveProperty('p1');
  });

  it('shows the base variant of the chain (base + fw 2.2.0) and applies the device value', () => {
    const store = makeStore(fwChain);

    store.setFromDeviceRegisters({ p1: 1 }, undefined);

    const param = getParam(store, 'p1');
    expect(param.activeVariantIndex).toBe(0);
    expect(param.isSupportedByFirmware).toBe(true);
    expect(param.value).toBe(1);
  });
});

describe('DeviceSettingsObjectStore with condition variants of different fw (mode==1/fw 1.0, mode==2/fw 2.0)', () => {
  const parameters: WbDeviceTemplateParameter[] = [
    { id: 'mode', title: 'Mode', enum: [1, 2], default: 1 },
    { id: 'p1', title: 'P1', enum: [0, 1], default: 0, fw: '1.0', condition: 'mode==1', dependencies: ['mode'] },
    { id: 'p1', title: 'P1', enum: [0, 1], default: 0, fw: '2.0', condition: 'mode==2', dependencies: ['mode'] },
  ];

  it('on firmware 1.5 supports the parameter while mode==1 and disables it with hint "since 2.0" on mode==2', () => {
    const store = makeStore(parameters);
    store.setFromDeviceRegisters({ mode: 1, p1: 0 }, '1.5');

    const param = getParam(store, 'p1');
    expect(param.activeVariantIndex).toBe(0);
    expect(param.isSupportedByFirmware).toBe(true);
    expect(param.hasConflictingVariants).toBe(false);

    getActiveStore(store, 'mode').setValue(2);

    expect(param.activeVariantIndex).toBe(1);
    expect(param.isSupportedByFirmware).toBe(false);
    expect(param.supportedFirmware).toBe('2.0');
    expect(param.hasConflictingVariants).toBe(false);
  });

  it('applies the device value on firmware 1.5 when the fw 2.0 declaration comes first in the template', () => {
    const store = makeStore([
      { id: 'mode', title: 'Mode', enum: [1, 2], default: 1 },
      { id: 'p1', title: 'P1', enum: [0, 1], default: 0, fw: '2.0', condition: 'mode==2', dependencies: ['mode'] },
      { id: 'p1', title: 'P1', enum: [0, 1], default: 0, fw: '1.0', condition: 'mode==1', dependencies: ['mode'] },
    ]);

    store.setFromDeviceRegisters({ mode: 1, p1: 1 }, '1.5');

    const param = getParam(store, 'p1');
    expect(param.value).toBe(1);
    expect(param.isSupportedByFirmware).toBe(true);
    expect(param.activeVariantIndex).toBe(1);
    expect(store.value.p1).toBe(1);
  });

  it('hides the parameter on 1.5 while mode==0 enables no variant and resets it to default after commit', () => {
    const store = makeStore([
      { id: 'mode', title: 'Mode', enum: [0, 1, 2], default: 0 },
      { id: 'p1', title: 'P1', enum: [0, 1], default: 0, fw: '1.0', condition: 'mode==1', dependencies: ['mode'] },
      { id: 'p1', title: 'P1', enum: [0, 1], default: 0, fw: '2.0', condition: 'mode==2', dependencies: ['mode'] },
    ]);
    store.setFromDeviceRegisters({ mode: 0, p1: 1 }, '1.5');

    const param = getParam(store, 'p1');
    expect(param.activeVariantIndex).toBe(-1);
    expect(param.value).toBeUndefined();
    expect(param.isDirty).toBe(false);
    expect(param.hasErrors).toBe(false);
    expect(store.value).not.toHaveProperty('p1');

    store.commit();
    getActiveStore(store, 'mode').setValue(1);

    expect(param.value).toBe(0);
  });
});

describe('WbDeviceParameterEditor.hasConflictingVariants', () => {
  it('reports a template error when declarations with different conditions are enabled at once', () => {
    const store = makeStore([
      { id: 'mode', title: 'Mode', enum: [0, 1], default: 1 },
      { id: 'p1', title: 'P1', enum: [0, 1], default: 0, condition: 'mode==1', dependencies: ['mode'] },
      { id: 'p1', title: 'P1', enum: [0, 1], default: 0, condition: 'mode>0', dependencies: ['mode'] },
    ]);

    expect(getParam(store, 'p1').hasConflictingVariants).toBe(true);
  });

  it('does not report an error for a chain of fw variants sharing the same condition', () => {
    const store = makeStore([
      { id: 'mode', title: 'Mode', enum: [0, 1], default: 1 },
      { id: 'p1', title: 'P1', enum: [0, 1], default: 0, condition: 'mode==1', dependencies: ['mode'] },
      { id: 'p1', title: 'P1', enum: [0, 1, 2], default: 0, fw: '2.0', condition: 'mode==1', dependencies: ['mode'] },
    ]);

    expect(getParam(store, 'p1').hasConflictingVariants).toBe(false);
    expect(getParam(store, 'p1').activeVariantIndex).toBe(1);
  });
});

describe('DeviceSettingsObjectStore.setFromDeviceRegisters', () => {
  it('applies the device value to a parameter whose condition depends on a parameter declared later', () => {
    const store = makeStore([
      { id: 'p1', title: 'P1', min: 0, max: 10, default: 0, condition: 'mode==1', dependencies: ['mode'] },
      { id: 'mode', title: 'Mode', enum: [0, 1], default: 0 },
    ]);

    store.setFromDeviceRegisters({ p1: 5, mode: 1 }, '1.0');

    expect(getParam(store, 'p1').isEnabledByCondition).toBe(true);
    expect(getParam(store, 'p1').value).toBe(5);
    expect(store.value.p1).toBe(5);
  });

  it('disables a parameter after the unsupported marker and restores it when the next read returns a number', () => {
    const store = makeStore([{ id: 'p1', title: 'P1', enum: [0, 1], default: 0, fw: '1.0' }]);

    store.setFromDeviceRegisters({ p1: 'unsupported' }, '2.0');

    const param = getParam(store, 'p1');
    expect(param.isSupportedByFirmware).toBe(false);
    expect(param.shouldStoreInConfig).toBe(false);

    store.setFromDeviceRegisters({ p1: 1 }, '2.0');

    expect(param.isSupportedByFirmware).toBe(true);
    expect(param.value).toBe(1);
    expect(store.value.p1).toBe(1);
  });
});
