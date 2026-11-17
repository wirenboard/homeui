import { makeObservable, observable, computed, action, autorun, type IReactionDisposer } from 'mobx';
import { CollapseButtonState } from '@/components/collapse-button';
import i18n from '@/i18n/config';
import { type DeviceTabStore } from '@/stores/device-manager';
import type { PortTabConfig, PortTabSerialConfig, PortTabTcpConfig } from '@/stores/device-manager/port-tab/types';
import { ObjectStore, StoreBuilder, type Translator, type JsonSchema } from '@/stores/json-schema-editor';
import { TabType } from './tabs-store';
import type { ModbusTcpPort, SerialPort, TcpPort } from './types';

function checkDuplicateSlaveIds(deviceTabs: DeviceTabStore[]) {
  const tabsBySlaveId = deviceTabs.reduce((acc, tab) => {
    if (tab.isModbusDevice && tab.slaveId !== undefined) {
      acc[tab.slaveId] ??= [];
      acc[tab.slaveId].push(tab);
    }
    return acc;
  }, {});
  Object.values(tabsBySlaveId).forEach((tabs: DeviceTabStore[]) => {
    if (tabs.length === 1) {
      tabs[0].setSlaveIdIsDuplicate(false);
    } else {
      tabs.forEach((tab) => tab.setSlaveIdIsDuplicate(true));
    }
  });
}

export function makeSerialPortTabName(data: SerialPort) {
  return data?.path?.replace(/^\/dev\/tty/, '');
}

export function makeTcpPortTabName(data: TcpPort) {
  return `TCP ${data.address || ''}:${data.port || ''}`;
}

export function makeModbusTcpPortTabName(data: ModbusTcpPort) {
  return `MODBUS TCP ${data.address || ''}:${data.port || ''}`;
}

export class PortTab {
  public title: string;
  public type: TabType = TabType.Port;
  public data: any;
  public schemaStore: ObjectStore;
  public schemaTranslator: Translator;
  public collapseButtonState: CollapseButtonState;
  public children: DeviceTabStore[];
  public reactionDisposers: IReactionDisposer[];
  public nameGenerationFn: (_data: any, _schema: JsonSchema) => string;

  constructor(
    data: any,
    schema: JsonSchema,
    nameGenerationFn: (_data: any, _schema: JsonSchema) => string,
    schemaTranslator: Translator,
  ) {
    this.title = schemaTranslator.find(schema.title, i18n.language);
    this.data = data;
    this.schemaStore = new ObjectStore(schema, data, false, new StoreBuilder());
    this.schemaTranslator = schemaTranslator;
    this.collapseButtonState = new CollapseButtonState(
      false,
      () => this.collapse(),
      () => this.restore(),
    );
    this.nameGenerationFn = nameGenerationFn;
    this.children = [];
    this.reactionDisposers = [];

    makeObservable(this, {
      name: computed,
      hasJsonValidationErrors: computed,
      isDirty: computed,
      commitData: action,
      addChildren: action,
      deleteChildren: action,
      collapse: action.bound,
      restore: action.bound,
      children: observable,
      hasChildren: computed,
      hasInvalidConfig: computed,
      canDelete: computed,
      path: computed,
      portType: computed,
    });
  }

  get name() {
    return this.nameGenerationFn(this.schemaStore.value, this.schemaStore.schema);
  }

  get hasJsonValidationErrors() {
    return this.schemaStore.hasErrors;
  }

  get isDirty() {
    return this.schemaStore.isDirty;
  }

  get editedData() {
    return this.schemaStore.value;
  }

  commitData() {
    this.data = this.schemaStore.value;
    this.schemaStore.commit();
  }

  collapse() {
    this.children.forEach((child) => {
      child.hidden = true;
    });
  }

  restore() {
    this.children.forEach((child) => {
      child.hidden = false;
    });
  }

  addChildren(deviceTab: DeviceTabStore) {
    const disposer = autorun(() => checkDuplicateSlaveIds(this.children));
    this.children.push(deviceTab);
    this.reactionDisposers.push(disposer);
  }

  deleteChildren(index: number) {
    const deviceTab = this.children.at(index);
    deviceTab?.beforeDelete();
    if (this.reactionDisposers.length > index) {
      this.reactionDisposers[index]();
      this.reactionDisposers.splice(index, 1);
    }
    this.children.splice(index, 1);
  }

  get hasChildren() {
    return this.children.length !== 0;
  }

  get childrenHasInvalidConfig() {
    return this.children.some((child) => child.hasInvalidConfig);
  }

  get hasInvalidConfig() {
    return this.hasJsonValidationErrors || this.childrenHasInvalidConfig;
  }

  get portType() {
    return this.schemaStore.value.port_type || 'serial';
  }

  get path() {
    const data = this.schemaStore.value;
    if (this.portType === 'serial') {
      return (data?.path as string) || '';
    }
    if (this.isTcpGateway) {
      return `${data?.address}:${data?.port}`;
    }
    return '';
  }

  get baseConfig(): PortTabConfig {
    const data = this.schemaStore.value;
    if (this.portType === 'serial') {
      return {
        path: data.path,
        baudRate: data.baud_rate,
        stopBits: data.stop_bits,
        parity: data.parity,
        dataBits: data.data_bits,
      } as PortTabSerialConfig;
    }
    if (this.isTcpGateway) {
      return {
        address: data.address,
        port: data.port,
        modbusTcp: this.isModbusTcp,
      } as PortTabTcpConfig;
    }
    return undefined;
  }

  get isTcpGateway() {
    return this.portType === 'tcp' || this.portType === 'modbus tcp';
  }

  get canDelete() {
    return !this.path.startsWith('/dev/ttyRS485');
  }

  get isEnabled() {
    return !!this.editedData?.enabled;
  }

  get isModbusTcp() {
    return this.portType === 'modbus tcp';
  }
}
