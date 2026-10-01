// @vitest-environment happy-dom
import { type DeviceTypesStore } from '@/stores/device-manager';
import type { ScannedDevice } from '@/stores/device-manager/types';
import { type ConfiguredDevices } from '../../config-editor/stores/configured-devices';
import { NewDevicesScanPageStore } from './new-devices-scan-page-store';
import { makeConfiguredDevices, makeDeviceTypesStore, makeScanned } from './test-fixtures';
import { SelectionPolicy } from './types';

const makeStore = (configuredDevices: ConfiguredDevices, deviceTypesStore: DeviceTypesStore) => {
  const onLeave = vi.fn();
  const store = new NewDevicesScanPageStore({} as any, deviceTypesStore, onLeave);
  store.configuredDevices = configuredDevices;
  // Mirror NewDevicesScanPageStore.select: the new-devices flow enables serial-number matching.
  store.commonScanStore.devicesStore.init(SelectionPolicy.Multiple, configuredDevices, {
    matchConfiguredBySerialNumber: true,
  });
  return { store, onLeave };
};

describe('NewDevicesScanPageStore.onOk address reassignment', () => {
  it('gives two selected conflicting devices with empty serial numbers on the same port distinct ' +
    'new addresses, and passes the same objects (with newAddress applied) on to addDevices ' +
    '(Defect 2 regression)', async () => {
    const deviceTypesStore = makeDeviceTypesStore();
    const { store, onLeave } = makeStore(makeConfiguredDevices(deviceTypesStore), deviceTypesStore);
    store.commonScanStore.devicesStore.setDevices([
      makeScanned({ uuid: 'a', sn: '', slaveId: 5 }),
      makeScanned({ uuid: 'b', sn: '', slaveId: 5 }),
    ]);
    const confirmAddressChange = vi.fn(async (_devices: ScannedDevice[]) => true);

    await store.onOk(confirmAddressChange);

    expect(confirmAddressChange).toHaveBeenCalledTimes(1);
    // The conflicting subset is handed to the dialog via the confirm payload (Option B), not stored.
    const modified = confirmAddressChange.mock.calls[0][0];
    expect(modified).toHaveLength(1);
    expect(modified[0].newAddress).toBe(1);
    expect(onLeave).toHaveBeenCalledTimes(1);
    const added = onLeave.mock.calls[0][0] as ScannedDevice[];
    expect(added).toHaveLength(2);
    const finalAddresses = added.map((d) => d.newAddress ?? d.address).sort((x, y) => x - y);
    // Both devices are added with distinct, non-conflicting addresses (5 kept, the other reassigned).
    expect(finalAddresses).toEqual([1, 5]);
    expect(new Set(finalAddresses).size).toBe(2);
  });

  it('reassigns a genuinely new device whose address collides with an existing configured address, ' +
    'writing newAddress onto the object handed to addDevices', async () => {
    const deviceTypesStore = makeDeviceTypesStore();
    const { store, onLeave } = makeStore(
      makeConfiguredDevices(deviceTypesStore, [{ slaveId: '5', sn: '111' }]),
      deviceTypesStore,
    );
    store.commonScanStore.devicesStore.setDevices([makeScanned({ uuid: 'a', sn: '222', slaveId: 5 })]);
    const confirmAddressChange = vi.fn(async () => true);

    await store.onOk(confirmAddressChange);

    expect(confirmAddressChange).toHaveBeenCalledTimes(1);
    const added = onLeave.mock.calls[0][0] as ScannedDevice[];
    expect(added).toHaveLength(1);
    expect(added[0].address).toBe(5);
    expect(added[0].newAddress).toBe(1);
  });

  it('does not open the confirm dialog and assigns no new address when there is no conflict', async () => {
    const deviceTypesStore = makeDeviceTypesStore();
    const { store, onLeave } = makeStore(makeConfiguredDevices(deviceTypesStore), deviceTypesStore);
    store.commonScanStore.devicesStore.setDevices([makeScanned({ uuid: 'a', sn: '', slaveId: 7 })]);
    const confirmAddressChange = vi.fn(async () => true);

    await store.onOk(confirmAddressChange);

    expect(confirmAddressChange).not.toHaveBeenCalled();
    const added = onLeave.mock.calls[0][0] as ScannedDevice[];
    expect(added).toHaveLength(1);
    expect(added[0].newAddress).toBeUndefined();
  });

  it('does not add any device when the user cancels the address-conflict dialog', async () => {
    const deviceTypesStore = makeDeviceTypesStore();
    const { store, onLeave } = makeStore(makeConfiguredDevices(deviceTypesStore), deviceTypesStore);
    store.commonScanStore.devicesStore.setDevices([
      makeScanned({ uuid: 'a', sn: '', slaveId: 5 }),
      makeScanned({ uuid: 'b', sn: '', slaveId: 5 }),
    ]);
    const confirmAddressChange = vi.fn(async () => null);

    await store.onOk(confirmAddressChange);

    expect(confirmAddressChange).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();
  });
});

describe('NewDevicesScanPageStore.onOk re-scan idempotency (Scenario 1)', () => {
  it('does not re-offer or reassign a device already in the config (matched by serial number) on ' +
    're-scan: it stays in the already-configured list while a genuinely new device is added normally', async () => {
    const deviceTypesStore = makeDeviceTypesStore();
    // The config already contains a device with sn '111' at slave_id 10 (e.g. added but not saved).
    const { store, onLeave } = makeStore(
      makeConfiguredDevices(deviceTypesStore, [{ slaveId: '10', sn: '111' }]),
      deviceTypesStore,
    );
    // Re-scan returns that same device (sn '111', still at slave_id 10) plus one genuinely new device.
    store.commonScanStore.devicesStore.setDevices([
      makeScanned({ uuid: 'already-configured', sn: '111', slaveId: 10 }),
      makeScanned({ uuid: 'new', sn: '222', slaveId: 6 }),
    ]);

    // The already-configured device is not selectable and is absent from the selection.
    expect(store.commonScanStore.devicesStore.alreadyConfiguredDevices).toHaveLength(1);
    expect(store.commonScanStore.devicesStore.alreadyConfiguredDevices[0].selectable).toBe(false);
    expect(store.commonScanStore.getSelectedDevices().map((d) => d.sn)).toEqual(['222']);

    const confirmAddressChange = vi.fn(async () => true);
    await store.onOk(confirmAddressChange);

    // No conflict is raised for the already-configured device, and it is never handed to addDevices.
    expect(confirmAddressChange).not.toHaveBeenCalled();
    const added = onLeave.mock.calls[0][0] as ScannedDevice[];
    expect(added).toHaveLength(1);
    expect(added[0].sn).toBe('222');
    expect(added.some((d) => d.sn === '111')).toBe(false);
  });
});
