// @vitest-environment happy-dom
import { autorun } from 'mobx';
import type { JsonSchema } from '@/stores/json-schema-editor';
import type { WbDeviceParametersGroup, WbDeviceTemplateParameter } from '../../types';
import { DeviceSettingsObjectStore } from './device-settings-store';

// A group declared twice: the plain declaration and the one brought by the firmware which added
// an option to the parameter of the group, carrying a description of that option
const groupFwChain: WbDeviceParametersGroup[] = [
  { id: 'g1', title: 'G1' },
  { id: 'g1', title: 'G1', description: 'the option added in 2.2.0', fw: '2.2.0' },
];

const groupParameters: WbDeviceTemplateParameter[] = [
  { id: 'p1', title: 'P1', enum: [0, 1], default: 0, group: 'g1' },
];

// Minimal device schema with groups: the parameters live in the declared groups.
const makeStore = (groups: WbDeviceParametersGroup[], parameters = groupParameters) =>
  new DeviceSettingsObjectStore(
    {
      type: 'object',
      properties: { slave_id: { type: 'string' } },
      device: { groups, parameters },
    } as unknown as JsonSchema,
    {},
  );

const getGroup = (store: DeviceSettingsObjectStore, id: string) =>
  store.topLevelGroup.subgroups.find((group) => group.id === id);

describe('DeviceSettingsObjectStore with fw variants of a group (base + fw 2.2.0)', () => {
  it('keeps one group with both declarations as variants instead of showing the group twice', () => {
    const store = makeStore(groupFwChain);

    expect(store.topLevelGroup.subgroups).toHaveLength(1);
    expect(getGroup(store, 'g1').variants).toHaveLength(2);
    expect(getGroup(store, 'g1').parameters.map((param) => param.id)).toEqual(['p1']);
  });

  it('shows the description of the newest variant before the device firmware is read', () => {
    const store = makeStore(groupFwChain);

    expect(getGroup(store, 'g1').properties.description).toBe('the option added in 2.2.0');
  });

  it('drops the description on firmware 2.1.0, older than the declaration which brings it', () => {
    const store = makeStore(groupFwChain);

    store.setFromDeviceRegisters({ p1: 0 }, '2.1.0');

    const group = getGroup(store, 'g1');
    expect(group.properties.description).toBeUndefined();
    expect(group.properties.title).toBe('G1');
  });

  it.each(['2.2.0', '3.0.0'])('shows the description on firmware %s', (fw) => {
    const store = makeStore(groupFwChain);

    store.setFromDeviceRegisters({ p1: 0 }, fw);

    expect(getGroup(store, 'g1').properties.description).toBe('the option added in 2.2.0');
  });

  it('picks the declaration on every read, whichever order the declarations come in', () => {
    const store = makeStore([...groupFwChain].reverse());

    store.setFromDeviceRegisters({ p1: 0 }, '2.1.0');
    expect(getGroup(store, 'g1').properties.description).toBeUndefined();

    store.setFromDeviceRegisters({ p1: 0 }, '2.2.0');
    expect(getGroup(store, 'g1').properties.description).toBe('the option added in 2.2.0');

    store.setFromDeviceRegisters({ p1: 0 }, '2.1.0');
    expect(getGroup(store, 'g1').properties.description).toBeUndefined();
  });

  it('notifies observers of the description when a read changes the acting declaration', () => {
    const store = makeStore(groupFwChain);
    const seen: (string | undefined)[] = [];
    const dispose = autorun(() => seen.push(getGroup(store, 'g1').properties.description));

    store.setFromDeviceRegisters({ p1: 0 }, '2.1.0');
    store.setFromDeviceRegisters({ p1: 0 }, '2.2.0');
    dispose();

    expect(seen).toEqual(['the option added in 2.2.0', undefined, 'the option added in 2.2.0']);
  });

  it('applies the firmware of a read that brought no values, the daemon reports no parameters '
    + 'when the device firmware supports none of them', () => {
    const store = makeStore(groupFwChain);

    store.setFromDeviceRegisters(null, '2.1.0');

    expect(getGroup(store, 'g1').properties.description).toBeUndefined();
  });

  it('acts as the oldest declaration when the read reported no firmware version', () => {
    const store = makeStore(groupFwChain);

    store.setFromDeviceRegisters({ p1: 0 }, undefined);

    expect(getGroup(store, 'g1').properties.description).toBeUndefined();
  });
});

describe('DeviceSettingsObjectStore with fw variants of a group nested in another group', () => {
  // Every variant carries its own display fields, the place in the tree comes from the first declaration
  const nestedGroups: WbDeviceParametersGroup[] = [
    { id: 'parent', title: 'Parent' },
    { id: 'child', title: 'Child', group: 'parent', order: 5 },
    { id: 'child', title: 'Child', group: 'parent', order: 5, description: 'the option added in 2.2.0', fw: '2.2.0' },
  ];

  const nestedParameters: WbDeviceTemplateParameter[] = [
    { id: 'p1', title: 'P1', enum: [0, 1], default: 0, group: 'child' },
  ];

  const childOf = (store: DeviceSettingsObjectStore) => getGroup(store, 'parent').subgroups[0];

  it('keeps the group in its parent and follows the firmware with the description', () => {
    const store = makeStore(nestedGroups, nestedParameters);
    const child = childOf(store);

    expect(store.topLevelGroup.subgroups.map((group) => group.id)).toEqual(['parent']);
    expect(child.id).toBe('child');
    expect(child.properties.description).toBe('the option added in 2.2.0');

    store.setFromDeviceRegisters({ p1: 0 }, '2.1.0');

    expect(child.properties.description).toBeUndefined();
    expect(child.properties.title).toBe('Child');
    expect(getGroup(store, 'parent').subgroups.map((group) => group.id)).toEqual(['child']);
  });

  it('keeps the tree and the order of an incomplete declaration, only its title is lost', () => {
    // A variant has to declare the display fields it needs, this one declares none of them
    const store = makeStore(
      [nestedGroups[0], nestedGroups[1], { id: 'child', description: 'incomplete', fw: '2.2.0' }],
      nestedParameters,
    );
    const child = childOf(store);

    expect(child.id).toBe('child');
    expect(child.parentId).toBe('parent');
    expect(child.order).toBe(5);
    expect(child.properties.title).toBeUndefined();

    store.setFromDeviceRegisters({ p1: 0 }, '2.1.0');

    expect(child.properties.title).toBe('Child');
  });
});

describe('DeviceSettingsObjectStore with a single declaration of a group', () => {
  it('keeps the declaration of a group with fw on an older firmware, there is nothing else to show', () => {
    const store = makeStore([{ id: 'g1', title: 'G1', description: 'since 2.2.0', fw: '2.2.0' }]);

    store.setFromDeviceRegisters({ p1: 0 }, '2.1.0');

    expect(getGroup(store, 'g1').properties.description).toBe('since 2.2.0');
  });

  it('keeps the description of a group without fw on any firmware', () => {
    const store = makeStore([{ id: 'g1', title: 'G1', description: 'always' }]);

    store.setFromDeviceRegisters({ p1: 0 }, '1.0.0');

    expect(getGroup(store, 'g1').properties.description).toBe('always');
  });

  it('acts as the last of two declarations with the same fw while the firmware supports them', () => {
    const store = makeStore([
      { id: 'g1', title: 'G1', description: 'first', fw: '2.2.0' },
      { id: 'g1', title: 'G1', description: 'second', fw: '2.2.0' },
    ]);

    store.setFromDeviceRegisters({ p1: 0 }, '2.2.0');

    expect(getGroup(store, 'g1').properties.description).toBe('second');
  });
});
