// @vitest-environment happy-dom
import { type DeviceTypesStore } from '@/stores/device-manager';
import { CommonScanStore } from './scan-page-store';
import { makeConfiguredDevices, makeDeviceTypesStore, makeScanned } from './test-fixtures';
import { SelectionPolicy } from './types';

describe('DevicesStore.setDevices classification', () => {
  let deviceTypesStore: DeviceTypesStore;
  let store: CommonScanStore;

  beforeEach(() => {
    deviceTypesStore = makeDeviceTypesStore();
    store = new CommonScanStore({} as any, deviceTypesStore);
  });

  // The new-devices flow opts into serial-number de-duplication (matchConfiguredBySerialNumber),
  // mirroring NewDevicesScanPageStore.select.
  describe('new-devices flow (serial-number matching enabled)', () => {
    it('places a scanned device whose serial number is already in the in-memory config into the ' +
      'already-configured list, not into new devices', () => {
      store.devicesStore.init(
        SelectionPolicy.Multiple,
        makeConfiguredDevices(deviceTypesStore, [{ slaveId: '10', sn: '111' }]),
        { matchConfiguredBySerialNumber: true },
      );

      store.devicesStore.setDevices([makeScanned({ uuid: 'a', sn: '111' })]);

      expect(store.devicesStore.newDevices).toHaveLength(0);
      expect(store.devicesStore.alreadyConfiguredDevices).toHaveLength(1);
      // Recognised by serial number even though the backend reports no configured_device_type;
      // the display name is derived from the scanned signature.
      expect(store.devicesStore.alreadyConfiguredDevices[0].title).toBe('name:wb-map12');
      expect(store.devicesStore.alreadyConfiguredDevices[0].selectable).toBe(false);
    });

    it('shows the type from the in-memory config, not a signature guess, for a device recognised by ' +
      'serial number', () => {
      // Config types the device as 'wb-map12e'; signature-derivation would instead yield 'wb-map12',
      // so asserting the former proves the type comes from the matched config entry.
      store.devicesStore.init(
        SelectionPolicy.Multiple,
        makeConfiguredDevices(deviceTypesStore, [{ slaveId: '10', sn: '111', deviceType: 'wb-map12e' }]),
        { matchConfiguredBySerialNumber: true },
      );

      store.devicesStore.setDevices([makeScanned({ uuid: 'a', sn: '111' })]);

      expect(store.devicesStore.alreadyConfiguredDevices).toHaveLength(1);
      expect(store.devicesStore.alreadyConfiguredDevices[0].title).toBe('name:wb-map12e');
    });

    it('keeps a scanned device with a serial number not present in the config in the new-devices list', () => {
      store.devicesStore.init(
        SelectionPolicy.Multiple,
        makeConfiguredDevices(deviceTypesStore, [{ slaveId: '10', sn: '111' }]),
        { matchConfiguredBySerialNumber: true },
      );

      store.devicesStore.setDevices([makeScanned({ uuid: 'b', sn: '222', slaveId: 6 })]);

      expect(store.devicesStore.newDevices).toHaveLength(1);
      expect(store.devicesStore.alreadyConfiguredDevices).toHaveLength(0);
    });

    it('classifies a scanned device as new without throwing when serial-number matching is enabled ' +
      'but the config is null (defensive guard)', () => {
      store.devicesStore.init(SelectionPolicy.Multiple, null, { matchConfiguredBySerialNumber: true });

      store.devicesStore.setDevices([makeScanned({ uuid: 'f', sn: '111' })]);

      expect(store.devicesStore.newDevices).toHaveLength(1);
      expect(store.devicesStore.alreadyConfiguredDevices).toHaveLength(0);
    });

    it('still routes a device the backend reports as configured (configured_device_type) to the ' +
      'already-configured list even without a serial-number match', () => {
      store.devicesStore.init(SelectionPolicy.Multiple, makeConfiguredDevices(deviceTypesStore, []), {
        matchConfiguredBySerialNumber: true,
      });

      store.devicesStore.setDevices([
        makeScanned({ uuid: 'c', sn: '', slaveId: 7, configuredDeviceType: 'wb-mr6c' }),
      ]);

      expect(store.devicesStore.newDevices).toHaveLength(0);
      expect(store.devicesStore.alreadyConfiguredDevices).toHaveLength(1);
      expect(store.devicesStore.alreadyConfiguredDevices[0].title).toBe('name:wb-mr6c');
    });
  });

  // The search-disconnected flow leaves serial-number matching OFF (default), mirroring
  // SearchDisconnectedScanPageStore, which does not set the flag.
  describe('search-disconnected flow (serial-number matching disabled)', () => {
    it('preserves the search-disconnected override: the searched device (matching port + slave_id) ' +
      'stays selectable in new devices even though the backend reports it as configured', () => {
      store.devicesStore.init(
        SelectionPolicy.Single,
        makeConfiguredDevices(deviceTypesStore, [{ slaveId: '10', sn: '333' }]),
        {
          allowToSelectDevicesInBootloader: true,
          selectableConfiguredDevice: { portPath: '/dev/ttyRS485-1', slaveId: 7 },
        },
      );

      store.devicesStore.setDevices([
        makeScanned({ uuid: 'd', sn: '333', slaveId: 7, configuredDeviceType: 'wb-mr6c' }),
      ]);

      expect(store.devicesStore.newDevices).toHaveLength(1);
      expect(store.devicesStore.alreadyConfiguredDevices).toHaveLength(0);
    });

    it('keeps a searched device that moved to a different slave_id selectable in new devices, even ' +
      'though its serial number is still in the config (would break restore otherwise)', () => {
      // Disconnected device is configured at slave_id 10 with sn '111'; the user searches for it.
      store.devicesStore.init(
        SelectionPolicy.Single,
        makeConfiguredDevices(deviceTypesStore, [{ slaveId: '10', sn: '111' }]),
        {
          allowToSelectDevicesInBootloader: true,
          selectableConfiguredDevice: { portPath: '/dev/ttyRS485-1', slaveId: 10 },
        },
      );

      // It is found again at a different slave_id (e.g. after a factory reset), so the backend
      // reports no configured_device_type and isSearchedDevice is false.
      store.devicesStore.setDevices([
        makeScanned({ uuid: 'e', sn: '111', slaveId: 20, configuredDeviceType: '' }),
      ]);

      expect(store.devicesStore.alreadyConfiguredDevices).toHaveLength(0);
      expect(store.devicesStore.newDevices).toHaveLength(1);
      expect(store.devicesStore.newDevices[0].selectable).toBe(true);
    });
  });
});
