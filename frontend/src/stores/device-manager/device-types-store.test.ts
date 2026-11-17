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
