import { makeObservable, observable, action, computed } from 'mobx';
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

    makeObservable(this, { active: observable, select: action, stopScanning: action, devicesToModify: computed });
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
    this.commonScanStore.startScanning(SelectionPolicy.Multiple, configuredDevices);
  }

  async onOk(confirmAddressChange: () => Promise<any>) {
    try {
      const devices = this.commonScanStore.getSelectedDevices();
      if (this.devicesToModify.length) {
        const updatedDevices = await confirmAddressChange();
        if (!updatedDevices) {
          return;
        }

        devices.forEach((device) => {
          const updatedDevice = updatedDevices.find((ud: any) => ud.sn === device.sn && ud.port === device.port);
          if (updatedDevice && updatedDevice.newAddress) {
            device.newAddress = updatedDevice.newAddress;
          }
        });
      }
      this.stopScanning();
      this?.onLeave(devices);
    } catch (err) {}
  }

  onCancel() {
    this.stopScanning();
    this?.onLeave([]);
  }

  get devicesToModify(): ScannedDevice[] {
    const modbusAddressesSet = new ModbusAddressSet(this.configuredDevices.getUsedAddresses());
    const devices = this.commonScanStore.getSelectedDevices();
    const devicesWithDuplicateAddresses = devices.filter((device) => {
      return !modbusAddressesSet.tryToAddUsedAddress(device.port, device.address);
    });
    const devicesToModify = [];
    devicesWithDuplicateAddresses.forEach((scannedDevice: any) => {
      const newAddress = modbusAddressesSet.fixAddress(scannedDevice.port, scannedDevice.address);
      if (newAddress !== scannedDevice.address) {
        scannedDevice.newAddress = newAddress;
        devicesToModify.push(scannedDevice);
      }
    });

    return devicesToModify;
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
}
