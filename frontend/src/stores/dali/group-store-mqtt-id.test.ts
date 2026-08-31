import { GroupStore } from './group-store';

vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/json-schema-editor', () => import('@/test/mocks/json-schema-editor'));

describe('GroupStore.controlsMqttId mirrors the daemon\'s group virtual-device id', () => {
  it('zero-pads the index onto the parent bus id', () => {
    // The daemon publishes f"{prefix}_group_{n:02d}" (virtual_devices.py) —
    // this fixture is that convention verbatim.
    const store = new GroupStore('g5', 5, { id: 'wb-dali_17_bus_1' } as any);
    expect(store.controlsMqttId).toBe('wb-dali_17_bus_1_group_05');
    const wide = new GroupStore('g12', 12, { id: 'wb-dali_17_bus_2' } as any);
    expect(wide.controlsMqttId).toBe('wb-dali_17_bus_2_group_12');
  });

  it('is null without a parent bus', () => {
    expect(new GroupStore('g1', 1, null).controlsMqttId).toBeNull();
  });
});
