// @vitest-environment happy-dom
import { DeviceTypesStore } from './device-types-store';
import type { DeviceTypeDescription } from './types';

const makeType = (overrides: Partial<DeviceTypeDescription> & { type: string; name: string }): DeviceTypeDescription =>
  ({
    deprecated: false,
    protocol: 'modbus',
    'mqtt-id': overrides.type,
    ...overrides,
  } as DeviceTypeDescription);

const makeStore = () => new DeviceTypesStore(async () => ({}));

describe('DeviceTypesStore.mergeDeviceTypes', () => {
  it('adds new types to an existing group', () => {
    const store = makeStore();
    store.setDeviceTypeGroups([
      { name: 'Group A', types: [makeType({ type: 'a1', name: 'A1' })] },
    ]);

    store.mergeDeviceTypes([
      { name: 'Group A', types: [makeType({ type: 'a2', name: 'A2' })] },
    ]);

    expect(store.deviceTypeDropdownOptions).toHaveLength(1);
    const options = store.deviceTypeDropdownOptions[0].options;
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.value)).toEqual(['a1', 'a2']);
  });

  it('replaces types with the same type key', () => {
    const store = makeStore();
    store.setDeviceTypeGroups([
      { name: 'Group A', types: [makeType({ type: 'a1', name: 'Old Name' })] },
    ]);

    store.mergeDeviceTypes([
      { name: 'Group A', types: [makeType({ type: 'a1', name: 'New Name' })] },
    ]);

    const options = store.deviceTypeDropdownOptions[0].options;
    expect(options).toHaveLength(1);
    expect(options[0].label).toBe('New Name');
    expect(store.getName('a1')).toBe('New Name');
  });

  it('creates a new group when response group does not exist', () => {
    const store = makeStore();
    store.setDeviceTypeGroups([
      { name: 'Group A', types: [makeType({ type: 'a1', name: 'A1' })] },
    ]);

    store.mergeDeviceTypes([
      { name: 'Group B', types: [makeType({ type: 'b1', name: 'B1' })] },
    ]);

    expect(store.deviceTypeDropdownOptions).toHaveLength(2);
    expect(store.deviceTypeDropdownOptions[1].label).toBe('Group B');
    expect(store.deviceTypeDropdownOptions[1].options[0].value).toBe('b1');
  });

  it('removes empty groups after merge moves types to another group', () => {
    const store = makeStore();
    store.setDeviceTypeGroups([
      { name: 'Old Group', types: [makeType({ type: 'x1', name: 'X1' })] },
    ]);

    store.mergeDeviceTypes([
      { name: 'New Group', types: [makeType({ type: 'x1', name: 'X1' })] },
    ]);

    expect(store.deviceTypeDropdownOptions).toHaveLength(1);
    expect(store.deviceTypeDropdownOptions[0].label).toBe('New Group');
  });

  it('sorts types alphabetically within groups after merge', () => {
    const store = makeStore();
    store.setDeviceTypeGroups([
      { name: 'Group A', types: [makeType({ type: 'a-z', name: 'Zebra' })] },
    ]);

    store.mergeDeviceTypes([
      { name: 'Group A', types: [makeType({ type: 'a-a', name: 'Alpha' })] },
    ]);

    const options = store.deviceTypeDropdownOptions[0].options;
    expect(options.map((o) => o.label)).toEqual(['Alpha', 'Zebra']);
  });

  it('updates the internal map so getName works for merged types', () => {
    const store = makeStore();
    store.setDeviceTypeGroups([]);

    store.mergeDeviceTypes([
      { name: 'Group A', types: [makeType({ type: 'new-type', name: 'New Type' })] },
    ]);

    expect(store.getName('new-type')).toBe('New Type');
    expect(store.isUnknown('new-type')).toBe(false);
  });
});

describe('DeviceTypesStore.removeDeviceType', () => {
  it('removes a device type from its group', () => {
    const store = makeStore();
    store.setDeviceTypeGroups([
      {
        name: 'Group A',
        types: [
          makeType({ type: 'a1', name: 'A1' }),
          makeType({ type: 'a2', name: 'A2' }),
        ],
      },
    ]);

    store.removeDeviceType('a1');

    expect(store.deviceTypeDropdownOptions).toHaveLength(1);
    expect(store.deviceTypeDropdownOptions[0].options).toHaveLength(1);
    expect(store.deviceTypeDropdownOptions[0].options[0].value).toBe('a2');
    expect(store.isUnknown('a1')).toBe(true);
  });

  it('removes the group when it becomes empty', () => {
    const store = makeStore();
    store.setDeviceTypeGroups([
      { name: 'Group A', types: [makeType({ type: 'a1', name: 'A1' })] },
      { name: 'Group B', types: [makeType({ type: 'b1', name: 'B1' })] },
    ]);

    store.removeDeviceType('a1');

    expect(store.deviceTypeDropdownOptions).toHaveLength(1);
    expect(store.deviceTypeDropdownOptions[0].label).toBe('Group B');
  });

  it('does nothing when the device type does not exist', () => {
    const store = makeStore();
    store.setDeviceTypeGroups([
      { name: 'Group A', types: [makeType({ type: 'a1', name: 'A1' })] },
    ]);

    store.removeDeviceType('nonexistent');

    expect(store.deviceTypeDropdownOptions).toHaveLength(1);
    expect(store.deviceTypeDropdownOptions[0].options).toHaveLength(1);
  });
});

describe('DeviceTypesStore.isUserDefined', () => {
  it('returns true for a type with user-defined flag', () => {
    const store = makeStore();
    store.setDeviceTypeGroups([
      { name: 'Custom', types: [makeType({ type: 'custom-1', name: 'Custom 1', 'user-defined': true })] },
    ]);

    expect(store.isUserDefined('custom-1')).toBe(true);
  });

  it('returns false for a type without user-defined flag', () => {
    const store = makeStore();
    store.setDeviceTypeGroups([
      { name: 'Standard', types: [makeType({ type: 'std-1', name: 'Standard 1' })] },
    ]);

    expect(store.isUserDefined('std-1')).toBe(false);
  });

  it('returns false for an unknown type', () => {
    const store = makeStore();
    store.setDeviceTypeGroups([]);

    expect(store.isUserDefined('nonexistent')).toBe(false);
  });
});
