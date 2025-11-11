import { makeObservable, observable, action, runInAction, computed } from 'mobx';
import { firmwareIsNewerOrEqual } from '~/utils/fwUtils';
import type { PortTabTcpConfig, PortTabConfig } from '../../port-tab/types';
import type {
  FwUpdateProxy,
  FwUpdateProxyGetFirmwareInfoParams,
  EmbeddedSoftwareType,
  FwUpdateProxyUpdateParams,
  UpdateItem
} from '../../types';
import { toDmRpcPortConfig, getIntAddress } from '../../utils';

export class EmbeddedSoftwareComponent {
  public current: string = '';
  public available: string = '';
  public updateProgress: number | null = null;
  public hasUpdate: boolean = false;
  public errorData: UpdateItem | null = null;
  public type: EmbeddedSoftwareType;

  private _fwUpdateProxy: FwUpdateProxy;

  constructor(fwUpdateProxy: FwUpdateProxy, type: EmbeddedSoftwareType) {
    this.type = type;
    this._fwUpdateProxy = fwUpdateProxy;

    makeObservable(this, {
      current: observable,
      available: observable,
      updateProgress: observable,
      errorData: observable.ref,
      hasUpdate: observable,
      isActual: computed,
      clearVersion: action,
      setUpdateProgress: action,
      startUpdate: action,
      setVersion: action,
      setupUpdate: action,
      resetUpdate: action,
    });
  }

  setVersion(current: string, available: string, hasUpdate: boolean) {
    this.current = current;
    this.available = available;
    this.hasUpdate = hasUpdate;
  }

  clearVersion() {
    this.current = '';
    this.available = '';
    this.hasUpdate = false;
  }

  get isActual() {
    return this.available !== '' && this.current === this.available;
  }

  setUpdateProgress(data: UpdateItem) {
    this.updateProgress = data.progress;
    this.current = data.from_version;
    this.available = data.to_version;
    this.errorData = this.errorData?.error?.message ? data : null;
    if ((this.hasError && this.isUpdating) || this.updateProgress === 100) {
      this.updateProgress = null;
      this.clearVersion();
    }
  }

  get isUpdating() {
    return this.updateProgress !== null;
  }

  async startUpdate(address: string | number, portConfig: PortTabConfig) {
    let params: FwUpdateProxyUpdateParams = {
      slave_id: getIntAddress(address),
      port: toDmRpcPortConfig(portConfig),
      type: this.type,
    };
    if ((portConfig as PortTabTcpConfig).modbusTcp) {
      params.protocol = 'modbus-tcp';
    }
    await this._fwUpdateProxy.Update(params);
  }

  setupUpdate() {
    this.updateProgress = 0;
    this.errorData = null;
  }

  resetUpdate() {
    this.updateProgress = null;
  }

  get hasError() {
    return !!this.errorData;
  }

  async clearError() {
    if (this.errorData !== null) {
      try {
        await this._fwUpdateProxy.ClearError({
          slave_id: this.errorData?.slave_id,
          port: this.errorData?.port,
          type: this.type,
        });
      } catch (err) { }
      runInAction(() => {
        this.errorData = null;
      });
    }
  }
}

export class ComponentFirmware extends EmbeddedSoftwareComponent {
  public model: string;

  constructor(fwUpdateProxy: FwUpdateProxy, model: string) {
    super(fwUpdateProxy, 'component');
    this.model = model;
  }
}

export class EmbeddedSoftware {
  public firmware: EmbeddedSoftwareComponent;
  public bootloader: EmbeddedSoftwareComponent;
  public components: Map<number, ComponentFirmware>;
  public canUpdate:boolean = false;
  public deviceModel:string = '';

  private _fwUpdateProxy: FwUpdateProxy;

  constructor(fwUpdateProxy: FwUpdateProxy) {
    this._fwUpdateProxy = fwUpdateProxy;
    this.firmware = new EmbeddedSoftwareComponent(fwUpdateProxy, 'firmware');
    this.bootloader = new EmbeddedSoftwareComponent(fwUpdateProxy, 'bootloader');
    this.components = new Map();
    this.canUpdate = false;
    this.deviceModel = '';

    makeObservable(this, {
      canUpdate: observable,
      deviceModel: observable,
      components: observable,
      setUpdateProgress: action,
      startFirmwareUpdate: action,
      isUpdating: computed,
      hasUpdate: computed,
      hasError: computed,
      hasComponentsUpdates: computed,
      componentsCanBeUpdated: computed,
    });
  }

  async updateVersion(address: string | number, portConfig: PortTabConfig) {
    try {
      if (await this._fwUpdateProxy.hasMethod('GetFirmwareInfo')) {
        const params: FwUpdateProxyGetFirmwareInfoParams = {
          slave_id: getIntAddress(address),
          port: toDmRpcPortConfig(portConfig),
          protocol: (portConfig as PortTabTcpConfig).modbusTcp ? 'modbus-tcp' : 'modbus',
        };
        const res = await this._fwUpdateProxy.GetFirmwareInfo(params);

        const newComponents = new Map();
        for (const [componentKey, componentData] of Object.entries(res.components || {})) {
          let component = new ComponentFirmware(this._fwUpdateProxy, componentData.model);
          component.setVersion(componentData.fw, componentData.available_fw, componentData.has_update);
          newComponents.set(parseInt(componentKey, 10), component);
        }

        runInAction(() => {
          this.canUpdate = res.can_update;
          this.deviceModel = res?.model || '';
          this.components = newComponents;
        });

        this.firmware.setVersion(res.fw, res.available_fw, res.fw_has_update);
        this.bootloader.setVersion(res.bootloader, res.available_bootloader, res.bootloader_has_update);
      }
    } catch (err) {
      this.clearVersion();
    }
  }

  setUpdateProgress(data: UpdateItem) {
    if (data.type === 'bootloader') {
      this.bootloader.setUpdateProgress(data);
    } else if (data.type === 'firmware') {
      this.firmware.setUpdateProgress(data);
    } else if (data.type === 'component') {
      if (!this.components.has(data.component_number)) {
        runInAction(() => {
          this.components.set(data.component_number, new ComponentFirmware(this._fwUpdateProxy, data.component_model));
        });
      }
      this.components.get(data.component_number)?.setUpdateProgress(data);
    }
  }

  clearComponentsVersion() {
    for (const component of this.components.values()) {
      component.clearVersion();
    }
  }

  clearComponentsError() {
    for (const component of this.components.values()) {
      component.clearError();
    }
  }

  hasComponentsError() {
    return [...this.components.values()].some((c) => c.hasError);
  }

  setupComponentsUpdate(components) {
    for (const component of components.values()) {
      component.setupUpdate();
    }
  }

  resetComponentsUpdate(components: Map<number, ComponentFirmware>) {
    for (const component of components.values()) {
      component.resetUpdate();
    }
  }

  async startFirmwareUpdate(address: string | number, portConfig: PortTabConfig) {
    const componentsCanBeUpdated = this.componentsCanBeUpdated;

    try {
      this.firmware.setupUpdate();
      this.setupComponentsUpdate(componentsCanBeUpdated);
      await this.firmware.startUpdate(address, portConfig);
    } catch (err) {
      this.firmware.resetUpdate();
      this.resetComponentsUpdate(componentsCanBeUpdated);
      throw err;
    }
    this.clearComponentsVersion();
  }

  async startBootloaderUpdate(address: string | number, portConfig: PortTabConfig) {
    const componentsCanBeUpdated = this.componentsCanBeUpdated;

    try {
      this.bootloader.setupUpdate();
      this.firmware.setupUpdate();
      this.setupComponentsUpdate(componentsCanBeUpdated);
      await this.bootloader.startUpdate(address, portConfig);
    } catch (err) {
      this.bootloader.resetUpdate();
      this.firmware.resetUpdate();
      this.resetComponentsUpdate(componentsCanBeUpdated);
      throw err;
    }
    this.firmware.clearVersion();
    this.clearComponentsVersion();
  }

  async startComponentsUpdate(address: string | number, portConfig: PortTabConfig) {
    const componentsCanBeUpdated = this.componentsCanBeUpdated;

    try {
      this.setupComponentsUpdate(componentsCanBeUpdated);
      const firstComponent = componentsCanBeUpdated.get(0);
      // Triggering update for the first component with components list causes all components update
      await firstComponent?.startUpdate(address, portConfig);
    } catch (err) {
      this.resetComponentsUpdate(componentsCanBeUpdated);
      throw err;
    }
  }

  clearVersion() {
    this.firmware.clearVersion();
    this.bootloader.clearVersion();
    this.clearComponentsVersion();
  }

  clearError() {
    this.firmware.clearError();
    this.bootloader.clearError();
    this.clearComponentsError();
  }

  get isUpdating() {
    return this.firmware.isUpdating ||
      this.bootloader.isUpdating ||
      [...this.components.values()].some((c) => c.isUpdating);
  }

  get hasUpdate() {
    return this.firmware.hasUpdate || this.hasComponentsUpdates;
  }

  get hasComponentsUpdates() {
    return this.componentsCanBeUpdated.size > 0;
  }

  get componentsCanBeUpdated() : Map<number, ComponentFirmware> {
    return new Map([...this.components].filter(([, component]) => component.hasUpdate));
  }

  get hasError() {
    return this.firmware.hasError || this.bootloader.hasError || [...this.components.values()].some((c) => c.hasError);
  }

  get bootloaderCanSaveSettings() {
    return firmwareIsNewerOrEqual('1.2.0', this.bootloader.current);
  }
}
