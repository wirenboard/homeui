import { action, makeAutoObservable, makeObservable, observable, reaction, computed } from 'mobx';
import { CollapseButtonState } from '@/components/collapse-button';
import i18n from '@/i18n/config';
import { type deviceManagerProxy as deviceManagerProxyInstance } from '@/services';
import type { DeviceTypesStore } from '@/stores/device-manager';
import { type ScannedDevice } from '@/stores/device-manager/types';
import { GlobalErrorStore } from './global-error-store';
import { ScanningProgressStore } from './scanning-progress-store';
import { SingleDeviceStore } from './single-device-store';
import { type FullScannedDevice } from './types';

export enum SelectionPolicy {
  Single = 'Select only one item',
  Multiple = 'Multiple selection',
}

export const ScanState = {
  Started: 'Started',
  Stopped: 'Stopped',
  NotSpecified: 'NotSpecified',
};

export interface SelectableConfiguredDevice {
  portPath: string;
  slaveId: number;
}

class DevicesStore {
  public newDevices: SingleDeviceStore[] = [];
  public alreadyConfiguredDevices: SingleDeviceStore[] = [];
  public configuredDevices = {};
  public deviceTypesStore: DeviceTypesStore;
  public selectionPolicy: SelectionPolicy = SelectionPolicy.Multiple;
  public allowToSelectDevicesInBootloader = false;
  public selectableConfiguredDevice: SelectableConfiguredDevice = null;
  public disposer: string;

  constructor(deviceTypesStore: DeviceTypesStore) {
    this.deviceTypesStore = deviceTypesStore;

    makeObservable(this, {
      newDevices: observable,
      alreadyConfiguredDevices: observable,
      setDevices: action,
    });
  }

  makeConfiguredDeviceStore(scannedDevice: FullScannedDevice) {
    return new SingleDeviceStore(
      scannedDevice,
      [this.deviceTypesStore.getName(scannedDevice.configured_device_type)],
      [scannedDevice.configured_device_type],
      false,
    );
  }

  isSearchedDevice(scannedDevice: FullScannedDevice) {
    const target = this.selectableConfiguredDevice;
    return (
      !!target &&
      scannedDevice.port?.path === target.portPath &&
      scannedDevice.cfg?.slave_id === target.slaveId
    );
  }

  makeNewDeviceStore(scannedDevice: FullScannedDevice) {
    const deviceTypes = this.deviceTypesStore.findNotDeprecatedDeviceTypes(
      scannedDevice.device_signature,
      scannedDevice.fw?.version,
    );

    const isSelectable = this.allowToSelectDevicesInBootloader || !scannedDevice.bootloader_mode;

    let deviceStore = new SingleDeviceStore(
      scannedDevice,
      deviceTypes.map((dt) => this.deviceTypesStore.getName(dt)),
      deviceTypes,
      isSelectable,
    );

    if (this.selectionPolicy === SelectionPolicy.Single) {
      deviceStore.disposer = reaction(
        () => deviceStore.selected,
        () => this.checkSingleSelection(deviceStore),
      );
      deviceStore.setSelected(false);
    }
    return deviceStore;
  }

  setDevices(scannedDevicesList: FullScannedDevice[]) {
    if (!Array.isArray(scannedDevicesList)) {
      return;
    }

    this.alreadyConfiguredDevices = [];
    this.newDevices.forEach((device) => device.disposer?.());
    this.newDevices = [];
    scannedDevicesList.forEach((scannedDevice) => {
      // A device found by "search disconnected device" matches an existing config entry by
      // (port + slave_id), so the backend always reports it as already configured. It still must
      // be selectable, otherwise the user can't re-apply connection settings (e.g. baud rate) to it.
      if (scannedDevice.configured_device_type && !this.isSearchedDevice(scannedDevice)) {
        this.alreadyConfiguredDevices.push(this.makeConfiguredDeviceStore(scannedDevice));
      } else {
        this.newDevices.push(this.makeNewDeviceStore(scannedDevice));
      }
    });

    this.alreadyConfiguredDevices.sort((d1, d2) => {
      if (d1.port === d2.port) {
        return d1.address - d2.address;
      }
      return d1.port.localeCompare(d2.port);
    });

  }

  init(
    selectionPolicy: SelectionPolicy,
    configuredDevices,
    allowToSelectDevicesInBootloader: boolean,
    selectableConfiguredDevice: SelectableConfiguredDevice = null,
  ) {
    this.configuredDevices = configuredDevices;
    this.allowToSelectDevicesInBootloader = !!allowToSelectDevicesInBootloader;
    this.selectableConfiguredDevice = selectableConfiguredDevice;
    this.newDevices.forEach((device) => device.disposer?.());
    this.selectionPolicy = selectionPolicy ?? SelectionPolicy.Multiple;
    this.newDevices = [];
    this.alreadyConfiguredDevices = [];
  }

  checkSingleSelection(selectedDevice) {
    if (!selectedDevice.selected) {
      return;
    }
    this.newDevices.forEach((device) => {
      if (device !== selectedDevice && device.selected) {
        device.setSelected(false);
      }
    });
  }
}

class MqttStateStore {
  waitStartup = true;
  deviceManagerIsAvailable = false;

  constructor() {
    makeAutoObservable(this);
  }

  setDeviceManagerUnavailable() {
    this.setStartupComplete();
    this.deviceManagerIsAvailable = false;
  }

  setDeviceManagerAvailable() {
    this.deviceManagerIsAvailable = true;
  }

  setStartupComplete() {
    this.waitStartup = false;
  }
}

export class CommonScanStore {
  public deviceManagerProxy: typeof deviceManagerProxyInstance;
  public mqttStore: MqttStateStore;
  public scanStore: ScanningProgressStore;
  public devicesStore: DevicesStore;
  public globalError: GlobalErrorStore;
  public acceptUpdates: boolean;
  public portPath: string;
  public useModbusTcp: boolean;
  public outOfOrderSlaveIds: string[];
  public alreadyConfiguredDevicesCollapseButtonState: CollapseButtonState;

  constructor(deviceManagerProxy: typeof deviceManagerProxyInstance, deviceTypesStore: DeviceTypesStore) {
    this.deviceManagerProxy = deviceManagerProxy;
    this.mqttStore = new MqttStateStore();
    this.scanStore = new ScanningProgressStore();
    this.devicesStore = new DevicesStore(deviceTypesStore);
    this.globalError = new GlobalErrorStore();
    this.acceptUpdates = false;
    this.portPath = null;
    this.useModbusTcp = false;
    this.outOfOrderSlaveIds = null;
    this.alreadyConfiguredDevicesCollapseButtonState = new CollapseButtonState(true);

    makeObservable(this, { hasSelectedItems: computed });
  }

  setDeviceManagerUnavailable() {
    this.acceptUpdates = false;
    this.mqttStore.setDeviceManagerUnavailable();
    this.globalError.setError(i18n.t('scan.errors.unavailable'));
  }

  setDeviceManagerAvailable() {
    this.mqttStore.setDeviceManagerAvailable();
  }

  setScanFailed(err: any) {
    this.acceptUpdates = false;
    this.scanStore.scanStopped();
    if ('MqttTimeoutError'.localeCompare(err.data) === 0) {
      this.setDeviceManagerUnavailable();
    } else {
      this.globalError.setError(err.message);
    }
  }

  async startScanningCommon(type: 'extended' | 'standard' | 'bootloader') {
    this.scanStore.startScan();
    const preserveOldResults = type !== 'extended';
    if (!preserveOldResults) {
      this.globalError.clearError();
    }
    try {
      if (await this.deviceManagerProxy.hasMethod('Start')) {
        let params: any = {
          scan_type: type,
          preserve_old_results: preserveOldResults,
        };
        if (this.portPath) {
          params.port = { path: this.portPath, protocol: this.useModbusTcp ? 'modbus-tcp' : 'modbus' };
        }
        if (this.outOfOrderSlaveIds) {
          params.out_of_order_slave_ids = this.outOfOrderSlaveIds;
        }
        await this.deviceManagerProxy.Start(params);
        this.acceptUpdates = true;
      } else {
        this.setDeviceManagerUnavailable();
      }
    } catch (err) {
      this.setScanFailed(err);
    }
  }

  async startExtendedScanning() {
    await this.startScanningCommon('extended');
  }

  async startStandardScanning() {
    await this.startScanningCommon('standard');
  }

  async startBootloaderScanning() {
    await this.startScanningCommon('bootloader');
  }

  stopScanning() {
    this.scanStore.scanStopped();
    this.acceptUpdates = false;
    this.deviceManagerProxy.Stop();
  }

  // Expected props structure
  // https://github.com/wirenboard/wb-device-manager/blob/main/README.md
  update(data) {
    if (data.error) {
      this.globalError.setError(data.error);
    }
    if (!this.acceptUpdates) {
      return;
    }
    this.scanStore.setStateFromMqtt(
      data.scanning,
      data.progress,
      data.scanning_ports,
      data.is_ext_scan,
    );
    this.devicesStore.setDevices(data.devices);
    this.mqttStore.setStartupComplete();
    if (this.scanStore.actualState === ScanState.Stopped) {
      this.acceptUpdates = false;
    }
  }

  /**
   * Starts the scanning process.
   *
   * @param {SelectionPolicy} selectionPolicy - The selection policy for scanning.
   * @param {Array} configuredDevices - The list of configured devices.
   * @param {string} portPath - The path of the port.
   * @param {boolean} useModbusTcp - Whether to use Modbus TCP protocol.
   * @param {Array} outOfOrderSlaveIds - The list of out-of-order slave IDs.
   * @param {boolean} allowToSelectDevicesInBootloader - The flag to allow to select devices in bootloader.
   * @param {SelectableConfiguredDevice} selectableConfiguredDevice - An already configured device
   *   (port + slave_id) that must stay selectable, used when searching for a disconnected device.
   * @returns {void}
   */
  startScanning(
    selectionPolicy: SelectionPolicy,
    configuredDevices,
    portPath?: string,
    useModbusTcp?: boolean,
    outOfOrderSlaveIds?: string[],
    allowToSelectDevicesInBootloader?: boolean,
    selectableConfiguredDevice?: SelectableConfiguredDevice,
  ): void {
    this.devicesStore.init(
      selectionPolicy,
      configuredDevices,
      allowToSelectDevicesInBootloader,
      selectableConfiguredDevice,
    );
    this.portPath = portPath;
    this.useModbusTcp = useModbusTcp;
    this.outOfOrderSlaveIds = outOfOrderSlaveIds;
    this.startExtendedScanning();
  }

  getSelectedDevices(): Partial<ScannedDevice>[] {
    return this.devicesStore.newDevices
      .filter((d) => d.selected)
      .map((d) => {
        return {
          title: d.title,
          port: d.port,
          sn: d.sn,
          address: d.scannedDevice.cfg.slave_id,
          baudRate: d.scannedDevice.cfg.baud_rate,
          parity: d.scannedDevice.cfg.parity,
          stopBits: d.scannedDevice.cfg.stop_bits,
          type: d.deviceType,
          gotByFastScan: d.gotByFastScan,
          bootloaderMode: d.bootloaderMode,
        };
      });
  }

  toggleDeviceSelection(value: boolean) {
    this.devicesStore.newDevices.map((devices) => {
      devices.setSelected(value);
    });
  }

  get deviceSelectionState(): boolean | 'indeterminate' {
    const devices = this.devicesStore.newDevices;

    if (!devices.length) {
      return false;
    }

    const selectedCount = devices.filter((device) => device.selected).length;

    if (!selectedCount) {
      return false;
    }

    if (selectedCount === devices.length) {
      return true;
    }

    return 'indeterminate';
  }

  get hasSelectedItems() {
    return (
      this.devicesStore.newDevices.some((d) => d.selected) &&
      this.scanStore.actualState !== ScanState.Started
    );
  }

  get isScanning() {
    return (
      this.scanStore.requiredState === ScanState.Started ||
      this.scanStore.actualState === ScanState.Started
    );
  }
}
