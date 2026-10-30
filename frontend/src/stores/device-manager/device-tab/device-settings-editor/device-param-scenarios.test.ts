// @vitest-environment happy-dom
/* eslint-disable max-lines -- one file holds all device parameter scenarios */
import type { JsonSchema } from '@/stores/json-schema-editor';
import type { DeviceTypesStore } from '../../device-types-store';
import type { PortTabConfig } from '../../port-tab/types';
import type { SerialDeviceProxy, WbDeviceTemplateParameter } from '../../types';
import { DeviceTabStore } from '../device-tab-store';
import { DeviceSettingsObjectStore } from './device-settings-store';
import { type WbDeviceParameterEditor } from './parameter-editor-store';

// Each scenario checks what the user sees on the field, the state of the Save button
// and what goes to the config. Save is checked as if the field were the only one in the editor

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

const fieldState = (param: WbDeviceParameterEditor) => {
  if (!param.isEnabledByCondition) {
    return 'hidden';
  }
  if (param.hasErrors) {
    return 'error';
  }
  return param.hasBadValueFromRegisters ? 'warning' : 'normal';
};

const saveState = (store: DeviceSettingsObjectStore) => {
  if (store.hasErrors) {
    return 'blocked';
  }
  return store.isDirty ? 'active' : 'inactive';
};

// list: an enum parameter, range: a parameter the user types in
const plainParameters: WbDeviceTemplateParameter[] = [
  { id: 'list', title: 'List', enum: [0, 1, 2], default: 0 },
  { id: 'range', title: 'Range', min: 0, max: 10, default: 0 },
];

const requiredParameter: WbDeviceTemplateParameter = {
  id: 'req', title: 'Required', enum: [0, 1], default: 0, required: true,
};

// list has a variant per mode with a different enum, extra is visible only on mode 3
const conditionParameters: WbDeviceTemplateParameter[] = [
  { id: 'mode', title: 'Mode', enum: [1, 2, 3], default: 1 },
  { id: 'list', title: 'List', enum: [0, 1, 2], default: 0, condition: 'mode==1', dependencies: ['mode'] },
  { id: 'list', title: 'List', enum: [0, 1], default: 0, condition: 'mode!=1', dependencies: ['mode'] },
  { id: 'extra', title: 'Extra', enum: [0, 1], default: 0, condition: 'mode==3', dependencies: ['mode'] },
];

const fwChain: WbDeviceTemplateParameter[] = [
  { id: 'list', title: 'List', enum: [0, 1], default: 0 },
  { id: 'list', title: 'List', enum: [0, 1, 2], default: 0, fw: '2.2.0' },
];

describe('Device parameter scenarios without reading the device', () => {
  it('a new device shows defaults, Save is active, only required parameters go to the config', () => {
    const store = makeStore([...plainParameters, requiredParameter]);

    expect(fieldState(getParam(store, 'list'))).toBe('normal');
    expect(getParam(store, 'list').value).toBe(0);
    expect(saveState(store)).toBe('active');
    expect(store.value).not.toHaveProperty('list');
    expect(store.value).not.toHaveProperty('range');
    expect(store.value.req).toBe(0);
  });

  it('a valid value typed by the user is shown normally, Save is active, the value goes to the config', () => {
    const store = makeStore(plainParameters);

    getActiveStore(store, 'range').setEditString('5');

    expect(fieldState(getParam(store, 'range'))).toBe('normal');
    expect(saveState(store)).toBe('active');
    expect(store.value.range).toBe(5);
  });

  it('an invalid value typed by the user is an error, Save is blocked', () => {
    const store = makeStore(plainParameters);

    getActiveStore(store, 'range').setEditString('50');

    expect(fieldState(getParam(store, 'range'))).toBe('error');
    expect(saveState(store)).toBe('blocked');
  });

  it('a parameter shown after the user switches its condition, absent in the config, '
    + 'shows its default, Save is active, the default goes to the config', () => {
    const store = makeStore(conditionParameters);
    expect(fieldState(getParam(store, 'extra'))).toBe('hidden');

    getActiveStore(store, 'mode').setValue(3);

    expect(fieldState(getParam(store, 'extra'))).toBe('normal');
    expect(getParam(store, 'extra').isConfigChanged).toBe(true);
    expect(store.value.extra).toBe(0);
  });

  it('a valid value from the config is shown normally, Save is inactive, the value stays in the config', () => {
    const store = makeStore(plainParameters, { list: 1 });

    expect(fieldState(getParam(store, 'list'))).toBe('normal');
    expect(saveState(store)).toBe('inactive');
    expect(store.value.list).toBe(1);
  });

  it('an invalid value from the config is an error, Save is blocked', () => {
    const store = makeStore(plainParameters, { range: 50 });

    expect(fieldState(getParam(store, 'range'))).toBe('error');
    expect(saveState(store)).toBe('blocked');
  });

  it('a config parameter whose condition is false is hidden, Save is inactive, it drops out of the config', () => {
    const store = makeStore(conditionParameters, { mode: 1, extra: 1 });

    expect(fieldState(getParam(store, 'extra'))).toBe('hidden');
    expect(saveState(store)).toBe('inactive');
    expect(store.value).not.toHaveProperty('extra');
  });
});

describe('Device parameter scenarios with a normal read from the device', () => {
  it.each([
    ['not required, Save is inactive, it does not go to the config', plainParameters, 'list', 'inactive', false],
    ['required, Save is active, the default goes to the config', [requiredParameter], 'req', 'active', true],
  ])('a value equal to the default, absent in the config, is shown normally, the parameter is %s', (
    _, parameters, id, save, isInConfig) => {
    const store = makeStore(parameters);

    store.setFromDeviceRegisters({ [id]: 0 }, '1.0');

    expect(fieldState(getParam(store, id))).toBe('normal');
    expect(saveState(store)).toBe(save);
    expect(Object.hasOwn(store.value, id)).toBe(isInConfig);
  });

  it('a valid value other than the default, absent in the config, is shown normally, Save is active, '
    + 'the value goes to the config and is a config value after save', () => {
    const store = makeStore(plainParameters);

    store.setFromDeviceRegisters({ list: 2 }, '1.0');

    expect(fieldState(getParam(store, 'list'))).toBe('normal');
    expect(saveState(store)).toBe('active');
    expect(store.value.list).toBe(2);

    store.commit();
    store.setFromDeviceRegisters({ list: 1 }, '1.0');

    expect(getParam(store, 'list').value).toBe(2);
    expect(saveState(store)).toBe('inactive');
  });

  it('an invalid value, absent in the config, is a warning with the value hidden, Save is inactive, '
    + 'it does not go to the config and stays a warning after save', () => {
    const store = makeStore(plainParameters);

    store.setFromDeviceRegisters({ range: 255 }, '1.0');

    expect(fieldState(getParam(store, 'range'))).toBe('warning');
    expect(store.hasBadValuesFromRegisters).toBe(true);
    expect(getActiveStore(store, 'range').editString).toBe('');
    expect(saveState(store)).toBe('inactive');
    expect(store.value).not.toHaveProperty('range');

    store.commit();

    expect(fieldState(getParam(store, 'range'))).toBe('warning');
  });

  it('a warning value replaced by the user with a valid one is shown normally, Save is active, '
    + 'the value goes to the config', () => {
    const store = makeStore(plainParameters);
    store.setFromDeviceRegisters({ range: 255 }, '1.0');

    getActiveStore(store, 'range').setEditString('5');

    expect(fieldState(getParam(store, 'range'))).toBe('normal');
    expect(saveState(store)).toBe('active');
    expect(store.value.range).toBe(5);
  });

  it('a warning value replaced by the user with another invalid one is an error, Save is blocked', () => {
    const store = makeStore(plainParameters);
    store.setFromDeviceRegisters({ range: 255 }, '1.0');

    getActiveStore(store, 'range').setEditString('50');

    expect(fieldState(getParam(store, 'range'))).toBe('error');
    expect(saveState(store)).toBe('blocked');
  });

  it('a device value of a parameter present in the config is ignored, the config value is shown, '
    + 'Save is inactive, the config value stays', () => {
    const store = makeStore(plainParameters, { list: 1 });

    store.setFromDeviceRegisters({ list: 2 }, '1.0');

    expect(fieldState(getParam(store, 'list'))).toBe('normal');
    expect(getParam(store, 'list').value).toBe(1);
    expect(saveState(store)).toBe('inactive');
    expect(store.value.list).toBe(1);
  });
});

describe('Device parameter scenarios with a read and a switch of a condition parameter', () => {
  it('a valid device value that does not fit the variant after the switch is an error, Save is blocked', () => {
    const store = makeStore(conditionParameters);
    store.setFromDeviceRegisters({ mode: 1, list: 2 }, '1.0');

    getActiveStore(store, 'mode').setValue(2);

    expect(fieldState(getParam(store, 'list'))).toBe('error');
    expect(saveState(store)).toBe('blocked');
  });

  it('a valid device value that fits the variant after the switch is shown normally, Save is active, '
    + 'the value goes to the config', () => {
    const store = makeStore(conditionParameters);
    store.setFromDeviceRegisters({ mode: 1, list: 1 }, '1.0');

    getActiveStore(store, 'mode').setValue(2);

    expect(fieldState(getParam(store, 'list'))).toBe('normal');
    expect(getParam(store, 'list').isConfigChanged).toBe(true);
    expect(store.value.list).toBe(1);
  });

  it('a warning value that stays invalid after the switch becomes an error, Save is blocked, '
    + 'even with the same allowed values', () => {
    const store = makeStore(conditionParameters);
    store.setFromDeviceRegisters({ mode: 2, list: 5 }, '1.0');
    expect(fieldState(getParam(store, 'list'))).toBe('warning');

    getActiveStore(store, 'mode').setValue(3);

    expect(fieldState(getParam(store, 'list'))).toBe('error');
    expect(saveState(store)).toBe('blocked');
  });

  it('a warning value that fits the variant after the switch is shown normally, Save is active, '
    + 'the value goes to the config', () => {
    const store = makeStore(conditionParameters);
    store.setFromDeviceRegisters({ mode: 2, list: 2 }, '1.0');
    expect(fieldState(getParam(store, 'list'))).toBe('warning');

    getActiveStore(store, 'mode').setValue(1);

    expect(fieldState(getParam(store, 'list'))).toBe('normal');
    expect(getParam(store, 'list').isConfigChanged).toBe(true);
    expect(store.value.list).toBe(2);
  });

  it.each([
    ['a valid value is shown normally, Save is active, it goes to the config', 1, 'normal', 'active', true],
    ['an invalid value is a warning, Save is inactive, it does not go to the config', 5, 'warning', 'inactive', false],
  ])('switching the condition parameter back to the read value restores the state after the read: %s', (
    _, deviceValue, state, save, isInConfig) => {
    const store = makeStore(conditionParameters, { mode: 2 });
    store.setFromDeviceRegisters({ list: deviceValue }, '1.0');

    getActiveStore(store, 'mode').setValue(1);
    getActiveStore(store, 'mode').setValue(2);

    expect(fieldState(getParam(store, 'list'))).toBe(state);
    expect(saveState(store)).toBe(save);
    expect(Object.hasOwn(store.value, 'list')).toBe(isInConfig);
  });
});

describe('Device parameter scenarios with a forced reread of the settings', () => {
  it('a valid value other than the default is shown normally and replaces the config value, '
    + 'Save is active if it differs from the config, otherwise inactive', () => {
    const store = makeStore(plainParameters, { list: 1, range: 5 });

    store.setFromDeviceRegisters({ list: 2, range: 5 }, '1.0', true);

    expect(fieldState(getParam(store, 'list'))).toBe('normal');
    expect(getParam(store, 'list').isConfigChanged).toBe(true);
    expect(getParam(store, 'range').isConfigChanged).toBe(false);
    expect(saveState(store)).toBe('active');
    expect(store.value.list).toBe(2);
    expect(store.value.range).toBe(5);
  });

  it.each([
    ['second', conditionParameters],
    ['first', [conditionParameters[0], conditionParameters[2], conditionParameters[1], conditionParameters[3]]],
  ])('an invalid value is a warning, Save is inactive, the config value drops out on save, '
    + 'also when the condition parameter differs from the config, the active variant is %s in the template', (
    _, parameters) => {
    const store = makeStore(parameters, { mode: 2, list: 1 });

    store.setFromDeviceRegisters({ mode: 3, list: 2 }, '1.0', true);

    expect(fieldState(getParam(store, 'list'))).toBe('warning');
    expect(getParam(store, 'list').isConfigChanged).toBe(false);
    expect(store.hasErrors).toBe(false);
    expect(store.value).not.toHaveProperty('list');
  });

  it('an invalid value saved after the reread leaves the config, a next normal read applies the device value', () => {
    const store = makeStore(plainParameters, { list: 1 });
    store.setFromDeviceRegisters({ list: 5 }, '1.0', true);
    store.commit();

    store.setFromDeviceRegisters({ list: 2 }, '1.0');

    expect(fieldState(getParam(store, 'list'))).toBe('normal');
    expect(getParam(store, 'list').value).toBe(2);
    expect(saveState(store)).toBe('active');
    expect(store.value.list).toBe(2);
  });

  it('a value equal to the default of a parameter in the config with another value is shown normally, '
    + 'Save is active, the default replaces the config value', () => {
    const store = makeStore(plainParameters, { list: 1 });

    store.setFromDeviceRegisters({ list: 0 }, '1.0', true);

    expect(fieldState(getParam(store, 'list'))).toBe('normal');
    expect(saveState(store)).toBe('active');
    expect(store.value.list).toBe(0);
  });

  it.each([
    ['not required, Save is inactive, it does not go to the config', plainParameters, 'list', 'inactive', false],
    ['required, Save is active, the default goes to the config', [requiredParameter], 'req', 'active', true],
  ])('a value equal to the default of a parameter absent in the config is shown normally, the parameter is %s', (
    _, parameters, id, save, isInConfig) => {
    const store = makeStore(parameters);

    store.setFromDeviceRegisters({ [id]: 0 }, '1.0', true);

    expect(fieldState(getParam(store, id))).toBe('normal');
    expect(saveState(store)).toBe(save);
    expect(Object.hasOwn(store.value, id)).toBe(isInConfig);
  });
});

describe('Device parameter scenarios with firmware and variants', () => {
  it('a parameter added in a newer firmware than the device one is disabled with a hint, '
    + 'Save is inactive, it drops out of the config', () => {
    const store = makeStore([{ id: 'list', title: 'List', enum: [0, 1, 2], default: 0, fw: '2.0' }], { list: 2 });

    store.setFromDeviceRegisters({}, '1.0');

    const param = getParam(store, 'list');
    expect(param.isSupportedByFirmware).toBe(false);
    expect(param.supportedFirmware).toBe('2.0');
    expect(saveState(store)).toBe('inactive');
    expect(store.value).not.toHaveProperty('list');
  });

  it('a parameter the device reports as unsupported is disabled without a hint, '
    + 'Save is inactive, it drops out of the config', () => {
    const store = makeStore(fwChain, { list: 1 });

    store.setFromDeviceRegisters({ list: 'unsupported' }, '2.2.0');

    const param = getParam(store, 'list');
    expect(param.isSupportedByFirmware).toBe(false);
    expect(param.supportedFirmware).toBeUndefined();
    expect(saveState(store)).toBe('inactive');
    expect(store.value).not.toHaveProperty('list');
  });

  it('a value only in the enum of a newer fw variant read from an older device, absent in the config, '
    + 'is a warning, Save is inactive, it does not go to the config', () => {
    const store = makeStore(fwChain);

    store.setFromDeviceRegisters({ list: 2 }, '2.1.0');

    expect(getActiveStore(store, 'list').schema.enum).toEqual([0, 1]);
    expect(fieldState(getParam(store, 'list'))).toBe('warning');
    expect(saveState(store)).toBe('inactive');
    expect(store.value).not.toHaveProperty('list');
  });

  it('the newest fw variant is active while the device firmware is unknown', () => {
    const store = makeStore(fwChain);

    expect(getActiveStore(store, 'list').schema.enum).toEqual([0, 1, 2]);
    expect(getParam(store, 'list').isSupportedByFirmware).toBe(true);
    expect(saveState(store)).toBe('inactive');
  });

  it('several variants enabled at once show a template error, Save is not blocked', () => {
    const store = makeStore([
      { id: 'mode', title: 'Mode', enum: [0, 1], default: 1 },
      { id: 'list', title: 'List', enum: [0, 1], default: 0, condition: 'mode==1', dependencies: ['mode'] },
      { id: 'list', title: 'List', enum: [0, 1], default: 0, condition: 'mode>0', dependencies: ['mode'] },
    ]);

    expect(getParam(store, 'list').hasConflictingVariants).toBe(true);
    expect(saveState(store)).toBe('inactive');
  });
});

describe('Device parameter scenarios with actions on the whole editor', () => {
  it('save keeps stored values as config values, leaves warnings as they are, Save becomes inactive', () => {
    const store = makeStore(plainParameters);
    store.setFromDeviceRegisters({ list: 2, range: 255 }, '1.0');
    expect(saveState(store)).toBe('active');

    store.commit();

    expect(saveState(store)).toBe('inactive');
    expect(store.value.list).toBe(2);
    expect(fieldState(getParam(store, 'range'))).toBe('warning');
    expect(store.value).not.toHaveProperty('range');
  });

  it('changing the device type rebuilds the editor with defaults, keeps the identity, then reads, '
    + 'Save is active', async () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' }, id: { type: 'string' }, slave_id: { type: 'string' } },
      device: { parameters: plainParameters },
    } as unknown as JsonSchema;
    const deviceTypesStore = {
      isUnknown: () => false,
      isDeprecated: () => false,
      withSubdevices: () => false,
      isModbusDevice: () => true,
      isWbDevice: () => true,
      getName: () => 'Device',
      getDefaultId: (type: string, slaveId: string) => `${type}_${slaveId}`,
      getSchema: async () => schema,
      findNotDeprecatedDeviceTypes: () => [],
      hasBetterFirmware: () => false,
    } as unknown as DeviceTypesStore;
    const serialDeviceProxy = {
      LoadConfig: async () => ({ parameters: { list: 2 }, fw: '1.0', model: 'WB' }),
    } as unknown as SerialDeviceProxy;
    const tab = new DeviceTabStore(
      { name: 'Kitchen light', id: 'kitchen_light', slave_id: '10', range: 5 },
      'wb-old-template',
      deviceTypesStore,
      undefined,
      serialDeviceProxy,
    );
    await tab.loadContent();

    await tab.setDeviceType('wb-new-template', { address: '10.0.0.1', port: 502 } as PortTabConfig);

    expect(tab.editedData.name).toBe('Kitchen light');
    expect(tab.mqttId).toBe('kitchen_light');
    expect(tab.slaveId).toBe('10');
    expect(getParam(tab.schemaStore, 'range').value).toBe(0);
    expect(tab.editedData).not.toHaveProperty('range');
    expect(tab.editedData.list).toBe(2);
    expect(tab.isDirty).toBe(true);
  });
});
