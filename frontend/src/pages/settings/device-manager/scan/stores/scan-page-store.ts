import { action, makeAutoObservable, makeObservable, observable, reaction, computed } from 'mobx';
import { CollapseButtonState } from '@/components/collapse-button';
import type { DeviceTypesStore } from '@/stores/device-manager';
import i18n from '~/i18n/react/config';
import { GlobalErrorStore } from './global-error-store';
import { ScanningProgressStore } from './scanning-progress-store';
import { SingleDeviceStore } from './single-device-store';
import type { ScannedDevice, ScannedDeviceToModify } from './types';

export enum SelectionPolicy {
  Single = 'Select only one item',
  Multiple = 'Multiple selection',
}

export const ScanState = {
  Started: 'Started',
  Stopped: 'Stopped',
  NotSpecified: 'NotSpecified',
};

class DevicesStore {
  public newDevices: SingleDeviceStore[] = [];
  public alreadyConfiguredDevices: SingleDeviceStore[] = [];
  public configuredDevices = {};
  public deviceTypesStore: DeviceTypesStore;
  public selectionPolicy: SelectionPolicy = SelectionPolicy.Multiple;
  public allowToSelectDevicesInBootloader = false;
  public disposer: string;

  constructor(deviceTypesStore: DeviceTypesStore) {
    this.deviceTypesStore = deviceTypesStore;

    makeObservable(this, {
      newDevices: observable,
      alreadyConfiguredDevices: observable,
      setDevices: action,
    });
  }

  makeConfiguredDeviceStore(scannedDevice: ScannedDevice) {
    return new SingleDeviceStore(
      scannedDevice,
      [this.deviceTypesStore.getName(scannedDevice.configured_device_type)],
      [scannedDevice.configured_device_type],
      false,
    );
  }

  makeNewDeviceStore(scannedDevice: ScannedDevice) {
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

  setDevices(scannedDevicesList: ScannedDevice[]) {
    if (!Array.isArray(scannedDevicesList)) {
      return;
    }

    this.alreadyConfiguredDevices = [];
    this.newDevices.forEach((device) => device.disposer?.());
    this.newDevices = [];
    scannedDevicesList.forEach((scannedDevice) => {
      if (scannedDevice.configured_device_type) {
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

  init(selectionPolicy: SelectionPolicy, configuredDevices, allowToSelectDevicesInBootloader: boolean) {
    this.configuredDevices = configuredDevices;
    this.allowToSelectDevicesInBootloader = !!allowToSelectDevicesInBootloader;
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
  public deviceManagerProxy: any;
  public mqttStore: MqttStateStore;
  public scanStore: ScanningProgressStore;
  public devicesStore: DevicesStore;
  public globalError: GlobalErrorStore;
  public acceptUpdates: boolean;
  public portPath: string;
  public useModbusTcp: boolean;
  public outOfOrderSlaveIds: string[];
  public alreadyConfiguredDevicesCollapseButtonState: CollapseButtonState;

  constructor(deviceManagerProxy: any, deviceTypesStore: DeviceTypesStore) {
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
   * @returns {void}
   */
  startScanning(
    selectionPolicy: SelectionPolicy,
    configuredDevices,
    portPath?: string,
    useModbusTcp?: boolean,
    outOfOrderSlaveIds?: string[],
    allowToSelectDevicesInBootloader?: boolean,
  ): void {
    this.devicesStore.init(selectionPolicy, configuredDevices, allowToSelectDevicesInBootloader);
    this.portPath = portPath;
    this.useModbusTcp = useModbusTcp;
    this.outOfOrderSlaveIds = outOfOrderSlaveIds;
    this.startExtendedScanning();
  }

  getSelectedDevices(): Partial<ScannedDeviceToModify>[] {
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
