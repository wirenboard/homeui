import { makeObservable, observable, action } from 'mobx';
import { type deviceManagerProxy as deviceManagerProxyInstance } from '@/services';
import { type DeviceTypesStore } from '@/stores/device-manager';
import type { ScannedDevice } from '@/stores/device-manager/types';
import { type ConfiguredDevices } from '../../config-editor/stores/configured-devices';
import { ModbusAddressSet } from './modbus-addresses-set';
import { CommonScanStore } from './scan-page-store';
import { SelectionPolicy } from './types';

export class NewDevicesScanPageStore {
  public commonScanStore: CommonScanStore;
  public active: boolean;
  public onLeave: (_devices: Partial<ScannedDevice>[]) => void;
  public configuredDevices: ConfiguredDevices;

  constructor(
    deviceManagerProxy: typeof deviceManagerProxyInstance,
    deviceTypesStore: DeviceTypesStore,
    onLeave: (_devices: Partial<ScannedDevice>[]
    ) => void) {
    this.commonScanStore = new CommonScanStore(deviceManagerProxy, deviceTypesStore);
    this.active = false;
    this.onLeave = onLeave;

    makeObservable(this, {
      active: observable,
      select: action,
      stopScanning: action,
    });
  }

  // Expected props structure
  // https://github.com/wirenboard/wb-device-manager/blob/main/README.md
  update(stringDataToRender: string) {
    // wb-device-manager could be stopped, so it will clear state topic and send empty string
    if (stringDataToRender === '') {
      this.commonScanStore.setDeviceManagerUnavailable();
      return;
    }

    const data = JSON.parse(stringDataToRender);
    if (!data.error && !this.commonScanStore.acceptUpdates) {
      return;
    }

    this.commonScanStore.update(data);
  }

  /**
   * Starts scanning for new devices
   * and activates page with a list of found devices to select
   */
  select(configuredDevices: ConfiguredDevices) {
    this.configuredDevices = configuredDevices;
    this.active = true;
    this.commonScanStore.startScanning(SelectionPolicy.Multiple, configuredDevices, {
      matchConfiguredBySerialNumber: true,
    });
  }

  async onOk(confirmAddressChange: (_devices: ScannedDevice[]) => Promise<any>) {
    try {
      // Resolve address conflicts on a single selected-devices array and pass that same array on to
      // addDevices, so the reassigned newAddress is never lost or mis-matched (e.g. when a device
      // reports no serial number). The conflicting subset is handed to the confirm dialog through
      // its payload, so this store keeps no transient UI state.
      const devices = this.commonScanStore.getSelectedDevices();
      const devicesToModify = this._resolveDuplicateAddresses(devices);
      if (devicesToModify.length) {
        const confirmed = await confirmAddressChange(devicesToModify);
        if (!confirmed) {
          return;
        }
      }
      this.stopScanning();
      this?.onLeave(devices);
    } catch (err) {}
  }

  onCancel() {
    this.stopScanning();
    this?.onLeave([]);
  }

  get isScanning() {
    return this.commonScanStore.isScanning;
  }

  stopScanning() {
    if (this.isScanning) {
      this.commonScanStore.stopScanning();
    }
    this.active = false;
  }

  /**
   * Assigns a new, non-conflicting address to every selected device whose address is already used
   * (by the in-memory config or by another selected device). The new address is written onto the
   * same object that onOk passes to addDevices, so the reassignment cannot be dropped. Returns the
   * subset of devices that received a new address, for the confirmation dialog to display.
   */
  _resolveDuplicateAddresses(devices: Partial<ScannedDevice>[]): ScannedDevice[] {
    const modbusAddressesSet = new ModbusAddressSet(this.configuredDevices.getUsedAddresses());
    const devicesWithDuplicateAddresses = devices.filter((device) => {
      return !modbusAddressesSet.tryToAddUsedAddress(device.port, device.address);
    });
    const devicesToModify: ScannedDevice[] = [];
    devicesWithDuplicateAddresses.forEach((device) => {
      const newAddress = modbusAddressesSet.fixAddress(device.port, device.address);
      if (newAddress !== device.address) {
        device.newAddress = newAddress;
        devicesToModify.push(device as ScannedDevice);
      }
    });
    return devicesToModify;
  }
}
