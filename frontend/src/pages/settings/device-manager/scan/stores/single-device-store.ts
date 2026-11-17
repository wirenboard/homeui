import { action, type IReactionDisposer, makeObservable, observable } from 'mobx';
import { type FullScannedDevice } from './types';

export class SingleDeviceStore {
  public scannedDevice: FullScannedDevice;
  public deviceTypes: string[];
  public selectable: boolean;
  public selected: boolean;
  public duplicateSlaveId: boolean = false;
  public misconfiguredPort: boolean = false;
  public duplicateMqttTopic: boolean = false;
  public disposer: IReactionDisposer = undefined;
  public names: string[];

  constructor(scannedDevice: FullScannedDevice, names: string[], deviceTypes: string[], selectable: boolean) {
    this.scannedDevice = scannedDevice;
    this.deviceTypes = deviceTypes;
    this.selectable = selectable;
    this.selected = this.selectable && !this.isUnknownType;
    this.names = names;

    makeObservable(this, {
      scannedDevice: observable.ref,
      selected: observable,
      setSelected: action.bound,
      update: action,
    });
  }

  get title() {
    if (this.names.length) {
      return this.names[0];
    }
    return this.scannedDevice.title;
  }

  get address() {
    return this.scannedDevice.cfg.slave_id;
  }

  get port() {
    return this.scannedDevice.port.path;
  }

  get sn() {
    return this.scannedDevice.sn;
  }

  get baudRate() {
    return this.scannedDevice.cfg.baud_rate;
  }

  get dataBits() {
    return this.scannedDevice.cfg.data_bits;
  }

  get parity() {
    return this.scannedDevice.cfg.parity;
  }

  get stopBits() {
    return this.scannedDevice.cfg.stop_bits;
  }

  get uuid() {
    return this.scannedDevice.uuid;
  }

  get deviceType() {
    if (this.deviceTypes.length) {
      return this.deviceTypes[0];
    }
    return undefined;
  }

  get gotByFastScan() {
    return this.scannedDevice?.fw?.ext_support;
  }

  setSelected(value: boolean) {
    this.selected = this.selectable && value;
  }

  update(scannedDevice: FullScannedDevice) {
    this.scannedDevice = scannedDevice;
  }

  setDuplicateSlaveId() {
    this.duplicateSlaveId = true;
  }

  setMisconfiguredPort() {
    this.misconfiguredPort = true;
  }

  setDuplicateMqttTopic() {
    this.duplicateMqttTopic = true;
  }

  get isUnknownType() {
    return !this.bootloaderMode && !this.deviceTypes.length;
  }

  get bootloaderMode() {
    return this.scannedDevice.bootloader_mode;
  }
}
