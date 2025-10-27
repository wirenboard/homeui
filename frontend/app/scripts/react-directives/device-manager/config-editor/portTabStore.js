import { makeObservable, observable, computed, action, autorun } from 'mobx';
import { ObjectStore, StoreBuilder } from '@/stores/json-schema-editor';
import i18n from '../../../i18n/react/config';
import CollapseButtonState from '../../components/buttons/collapseButtonState';
import { TabType } from './tabsStore';

function checkDuplicateSlaveIds(deviceTabs) {
  const tabsBySlaveId = deviceTabs.reduce((acc, tab) => {
    if (tab.isModbusDevice && tab.slaveId !== undefined) {
      acc[tab.slaveId] ??= [];
      acc[tab.slaveId].push(tab);
    }
    return acc;
  }, {});
  Object.values(tabsBySlaveId).forEach((tabs) => {
    if (tabs.length === 1) {
      tabs[0].setSlaveIdIsDuplicate(false);
    } else {
      tabs.forEach((tab) => tab.setSlaveIdIsDuplicate(true));
    }
  });
}

export function makeSerialPortTabName(data) {
  return data?.path?.replace(/^\/dev\/tty/, '');
}

export function makeTcpPortTabName(data) {
  return `TCP ${data.address || ''}:${data.port || ''}`;
}

export function makeModbusTcpPortTabName(data) {
  return `MODBUS TCP ${data.address || ''}:${data.port || ''}`;
}

export class PortTab {
  constructor(data, schema, nameGenerationFn, schemaTranslator) {
    this.title = schemaTranslator.find(schema.title, i18n.language);
    this.type = TabType.PORT;
    this.data = data;
    this.schemaStore = new ObjectStore(schema, data, false, new StoreBuilder());
    this.schemaTranslator = schemaTranslator;
    this.collapseButtonState = new CollapseButtonState(
      false,
      () => this.collapse(),
      () => this.restore()
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

  addChildren(deviceTab) {
    const disposer = autorun(() => checkDuplicateSlaveIds(this.children));
    this.children.push(deviceTab);
    this.reactionDisposers.push(disposer);
  }

  deleteChildren(index) {
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
      return data?.path || '';
    }
    if (this.isTcpGateway) {
      return `${data?.address}:${data?.port}`;
    }
    return '';
  }

  get baseConfig() {
    const data = this.schemaStore.value;
    if (this.portType === 'serial') {
      return {
        path: data.path,
        baudRate: data.baud_rate,
        stopBits: data.stop_bits,
        parity: data.parity,
        dataBits: data.data_bits,
      };
    }
    if (this.isTcpGateway) {
      return {
        address: data.address,
        port: data.port,
        modbusTcp: data.isModbusTcp,
      };
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
