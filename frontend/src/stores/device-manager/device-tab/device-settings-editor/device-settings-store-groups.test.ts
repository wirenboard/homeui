// @vitest-environment happy-dom
import type { JsonSchema } from '@/stores/json-schema-editor';
import type { WbDeviceParametersGroup, WbDeviceTemplateParameter } from '../../types';
import { DeviceSettingsObjectStore } from './device-settings-store';

// Minimal device schema with groups: the parameters live in the declared groups.
const makeStore = (groups: WbDeviceParametersGroup[], parameters: WbDeviceTemplateParameter[]) =>
  new DeviceSettingsObjectStore(
    {
      type: 'object',
      properties: { slave_id: { type: 'string' } },
      device: { groups, parameters },
    } as unknown as JsonSchema,
    {},
  );

const getGroup = (store: DeviceSettingsObjectStore, id: string) =>
  store.topLevelGroup.subgroups.find((group) => group.properties.id === id);

// A group declared twice: the base declaration and the one brought by the firmware which added
// an option to the parameter of the group, carrying a description of that option
const groupFwChain: WbDeviceParametersGroup[] = [
  { id: 'g1', title: 'G1' },
  { id: 'g1', title: 'G1', description: 'the option added in 2.2.0', fw: '2.2.0' },
];

const groupParameters: WbDeviceTemplateParameter[] = [
  { id: 'p1', title: 'P1', enum: [0, 1], default: 0, group: 'g1' },
];

describe('DeviceSettingsObjectStore with fw variants of a group (base + fw 2.2.0)', () => {
  it('merges the declarations into one group instead of showing the group twice', () => {
    const store = makeStore(groupFwChain, groupParameters);

    expect(store.topLevelGroup.subgroups).toHaveLength(1);
    expect(getGroup(store, 'g1').variants).toHaveLength(2);
    expect(getGroup(store, 'g1').parameters.map((param) => param.id)).toEqual(['p1']);
  });

  it('shows the description of the newest declaration while the device firmware is unknown', () => {
    const store = makeStore(groupFwChain, groupParameters);

    expect(getGroup(store, 'g1').properties.description).toBe('the option added in 2.2.0');
  });

  it('drops the description on firmware 2.1.0, older than the declaration which brings it', () => {
    const store = makeStore(groupFwChain, groupParameters);

    store.setFromDeviceRegisters({ p1: 0 }, '2.1.0');

    const group = getGroup(store, 'g1');
    expect(group.properties.description).toBeUndefined();
    expect(group.properties.title).toBe('G1');
  });

  it.each(['2.2.0', '3.0.0'])('shows the description on firmware %s', (fw) => {
    const store = makeStore(groupFwChain, groupParameters);

    store.setFromDeviceRegisters({ p1: 0 }, fw);

    expect(getGroup(store, 'g1').properties.description).toBe('the option added in 2.2.0');
  });

  it('picks the declaration by fw when the newest one comes first in the template', () => {
    const store = makeStore([...groupFwChain].reverse(), groupParameters);

    store.setFromDeviceRegisters({ p1: 0 }, '2.1.0');
    expect(getGroup(store, 'g1').properties.description).toBeUndefined();

    store.setFromDeviceRegisters({ p1: 0 }, '2.2.0');
    expect(getGroup(store, 'g1').properties.description).toBe('the option added in 2.2.0');
  });

  it('follows the firmware of the last read, in both directions', () => {
    const store = makeStore(groupFwChain, groupParameters);

    store.setFromDeviceRegisters({ p1: 0 }, '2.2.0');
    expect(getGroup(store, 'g1').properties.description).toBe('the option added in 2.2.0');

    store.setFromDeviceRegisters({ p1: 0 }, '2.1.0');
    expect(getGroup(store, 'g1').properties.description).toBeUndefined();
  });
});

describe('DeviceSettingsObjectStore with a single declaration of a group', () => {
  it('keeps the declaration of a group with fw on an older firmware, there is nothing else to show', () => {
    const store = makeStore(
      [{ id: 'g1', title: 'G1', description: 'since 2.2.0', fw: '2.2.0' }],
      groupParameters,
    );

    store.setFromDeviceRegisters({ p1: 0 }, '2.1.0');

    expect(getGroup(store, 'g1').properties.description).toBe('since 2.2.0');
  });

  it('keeps the description of a group without fw on any firmware', () => {
    const store = makeStore([{ id: 'g1', title: 'G1', description: 'always' }], groupParameters);

    store.setFromDeviceRegisters({ p1: 0 }, '1.0.0');

    expect(getGroup(store, 'g1').properties.description).toBe('always');
  });
});
