import { makeObservable, observable, action } from 'mobx';
import { type DeviceTypesStore } from '@/stores/device-manager';
import type { ScannedDevice } from '@/stores/device-manager/types';
import { CommonScanStore, SelectionPolicy } from './scan-page-store';

export class SearchDisconnectedScanPageStore {
  public commonScanStore: CommonScanStore;
  public active: boolean;
  public deviceTypesStore: DeviceTypesStore;
  public signatures: string[];
  public onLeave: (_selectedDevice: Partial<ScannedDevice>) => void;

  constructor(
    deviceManagerProxy: any,
    deviceTypesStore: DeviceTypesStore,
    onLeave: (_selectedDevice: Partial<ScannedDevice>) => void,
  ) {
    this.commonScanStore = new CommonScanStore(deviceManagerProxy, deviceTypesStore);
    this.active = false;
    this.deviceTypesStore = deviceTypesStore;
    this.onLeave = onLeave;

    makeObservable(this, {
      active: observable,
      select: action,
      stopScanning: action,
      onOk: action,
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

    let data = JSON.parse(stringDataToRender);
    if (!data.error && !this.commonScanStore.acceptUpdates) {
      return;
    }
    data.devices = data.devices.filter(
      (device) => device.bootloader_mode || this.signatures.includes(device.device_signature),
    );
    this.commonScanStore.update(data);
  }

  select(deviceType: string, portPath: string, useModbusTcp: boolean, configuredDevices, slaveId: string) {
    this.signatures = this.deviceTypesStore.getDeviceSignatures(deviceType);
    this.active = true;
    const slaveIdInt = parseInt(slaveId);
    let outOfOrderSlaveIds = [];
    if (!isNaN(slaveIdInt)) {
      outOfOrderSlaveIds.push(slaveIdInt);
    }
    this.commonScanStore.startScanning(
      SelectionPolicy.Single,
      configuredDevices,
      portPath,
      useModbusTcp,
      outOfOrderSlaveIds,
      true,
    );
  }

  onOk() {
    this.active = false;
    this?.onLeave(this.commonScanStore.getSelectedDevices()[0]);
  }

  onCancel() {
    this.stopScanning();
    this?.onLeave(undefined);
  }

  get isScanning() {
    return this.commonScanStore.isScanning;
  }

  stopScanning() {
    this.commonScanStore.stopScanning();
    this.active = false;
  }
}
