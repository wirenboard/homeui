import { makeAutoObservable } from 'mobx';
import { mbgatePath } from '@/common/paths';
import { makeParameterStoreFromJsonSchema } from '@/components/json-editor/forms';
import { type ConfigsStore } from '@/stores/configs';
import { type DevicesStore, type Device } from '@/stores/devices';
import { RegSpace } from './reg-space';
import type { AllRegisters, Register, RegisterType, RegisterTypeSelection } from './types';

const COIL_CONTROL_TYPES = ['switch', 'alarm', 'pushbutton'];
const DEFAULT_TCP_PORT = 502;
const ANY_HOST = ['', '*', '0.0.0.0'];

function isSameBinding(a?: Record<string, any>, b?: Record<string, any>): boolean {
  if (!a || !b) {
    return false;
  }
  if (a.path || b.path) {
    return !!a.path && a.path === b.path;
  }
  const isAnyHost = (host?: string) => ANY_HOST.includes(host ?? '');
  return a.port === b.port && (a.host === b.host || isAnyHost(a.host) || isAnyHost(b.host));
}

export class MbGateStore {
  public paramsStore: any = {};
  public error: string | null = null;
  #configsStore: ConfigsStore;
  #devicesStore: DevicesStore;

  constructor(configsStore: ConfigsStore, devicesStore: DevicesStore) {
    this.#configsStore = configsStore;
    this.#devicesStore = devicesStore;

    makeAutoObservable(this);
  }

  loadData() {
    this.#configsStore.getConfig(mbgatePath).then(() => {
      this.setSchemaAndData(this.#configsStore.config.schema, this.#configsStore.config.content);
    });
  }

  setSchemaAndData(schema: any, data: any) {
    this.paramsStore = makeParameterStoreFromJsonSchema(schema);
    this.paramsStore?.setValue(data);
    let keepalive = this.paramsStore.params?.['mqtt']?.params?.['keepalive'];
    keepalive.setStrict(false);
    keepalive.setDefaultText('60');
    this.paramsStore.submit();
  }

  async save() {
    try {
      await this.#configsStore.saveConfig(this.paramsStore.value);
      this.error = null;
      this.paramsStore.submit();
    } catch (err) {
      this.error = err.message;
    }
  }

  get additionalPorts(): any[] {
    return this.paramsStore.params?.['additional_ports']?.items ?? [];
  }

  addPort(): number {
    const ports = this.paramsStore.params['additional_ports'];
    ports.add();
    ports.items.at(-1).setValue({
      modbus: { host: '*', port: this.#getFreeTcpPort() },
      registers: { discretes: [], coils: [], inputs: [], holdings: [] },
    });
    return ports.items.length - 1;
  }

  removePort(index: number) {
    this.paramsStore.params['additional_ports'].remove(index);
  }

  getConfiguredControls(registersStore = this.paramsStore.params['registers']): string[] {
    return Object.values(registersStore.value).flatMap((registerTypeArray: any) =>
      registerTypeArray.map((register: Register) => register['topic']),
    );
  }

  addControls(
    selectedControls: string[],
    registerType: RegisterTypeSelection = 'auto',
    registersStore = this.paramsStore.params['registers'],
  ) {
    if (!selectedControls?.length) {
      return;
    }
    const registers = registersStore.value;
    let newRegs: AllRegisters = {
      coils: [],
      discretes: [],
      holdings: [],
      inputs: [],
    };

    selectedControls.forEach((cellId: string) => {
      const cell = this.#devicesStore.cells.get(cellId);
      const arrayType = registerType === 'auto' ? this.#getDefaultRegisterType(cell) : registerType;

      if (arrayType === 'coils' || arrayType === 'discretes') {
        newRegs[arrayType].push(this.#makeSingleBitRegisterBinding(cellId));
      } else if (cell.type === 'text') {
        newRegs[arrayType].push(this.#makeWordRegisterBinding(cellId, 'varchar'));
      } else {
        newRegs[arrayType].push(this.#makeWordRegisterBinding(cellId, 'signed'));
      }
    });

    this.#mergeRegs(registers, newRegs, 'coils');
    this.#mergeRegs(registers, newRegs, 'discretes');
    this.#mergeRegs(registers, newRegs, 'holdings');
    this.#mergeRegs(registers, newRegs, 'inputs');

    registersStore.setValue(registers);
  }

  checkAllControlsConfigured(registersStore = this.paramsStore.params?.['registers']): boolean {
    if (!registersStore) {
      return false;
    }
    const configuredControls = this.getConfiguredControls(registersStore);
    return Array.from(this.#devicesStore.filteredDevices.values()).every(
      (device: Device) => Array.from(device.cells).every((cellId) => configuredControls.includes(cellId)),
    );
  }

  get isDirty() {
    return this.paramsStore.isDirty;
  }

  get allowSave() {
    return this.isDirty && !this.paramsStore.hasErrors && !this.hasPortConflicts;
  }

  // Index 0 is the main port, index i + 1 is additional port i
  get portConflicts(): number[][] {
    const bindings = this.#portBindings;
    return bindings.map((binding, index) =>
      bindings.reduce<number[]>((conflicts, other, otherIndex) => {
        if (otherIndex !== index && isSameBinding(binding, other)) {
          conflicts.push(otherIndex);
        }
        return conflicts;
      }, []),
    );
  }

  get hasPortConflicts() {
    return this.portConflicts.some((conflicts) => conflicts.length);
  }

  get #portBindings(): Record<string, any>[] {
    if (!this.paramsStore.params) {
      return [];
    }
    return [this.paramsStore.params['modbus'], ...this.additionalPorts.map((port) => port.params.modbus)]
      .map((binding) => binding?.value);
  }

  #getFreeTcpPort(): number {
    const usedPorts = this.#portBindings.map((binding) => binding?.port);
    let port = DEFAULT_TCP_PORT;
    while (usedPorts.includes(port)) {
      port++;
    }
    return port;
  }

  #getDefaultRegisterType(cell: { type: string; readOnly: boolean }): RegisterType {
    if (COIL_CONTROL_TYPES.includes(cell.type)) {
      return cell.readOnly ? 'discretes' : 'coils';
    }
    return cell.readOnly ? 'inputs' : 'holdings';
  }

  #makeWordRegisterBinding(topic: string, format: Register['format']) {
    return {
      topic,
      enabled: true,
      unitId: 1,
      address: 1,
      format,
      size: format === 'varchar' ? 1 : 2,
      max: 0,
      scale: 1,
      byteswap: false,
      wordswap: false,
    };
  }

  #mergeRegs(registers: AllRegisters, newRegs: AllRegisters, type: string) {
    if (!newRegs[type].length) {
      return;
    }
    const regSpace = new RegSpace();
    registers[type].forEach((reg: Register) => regSpace.append(reg, false));
    newRegs[type].forEach((reg: Register) => regSpace.append(reg, true));
    registers[type] = registers[type].concat(newRegs[type]);
  }

  #makeSingleBitRegisterBinding(topic: string) {
    return { topic, enabled: true, unitId: 1, address: 1 };
  }
}
