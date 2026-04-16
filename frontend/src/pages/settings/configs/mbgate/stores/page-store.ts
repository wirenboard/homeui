import { makeAutoObservable } from 'mobx';
import { mbgatePath } from '@/common/paths';
import { type ConfigsStore } from '@/stores/configs';
import { type DevicesStore, type Device } from '@/stores/devices';
import i18n from '~/i18n/react/config';
import { makeParameterStoreFromJsonSchema } from '~/react-directives/forms/jsonSchemaForms';
import { RegSpace } from './reg-space';
import type { AllRegisters, Register } from './types';

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
    this.paramsStore = makeParameterStoreFromJsonSchema(schema, i18n.language);
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

  getConfiguredControls(): string[] {
    const registers = this.paramsStore.value['registers'];
    return Object.values(registers).flatMap((registerTypeArray: any) =>
      registerTypeArray.map((register: Register) => register['topic']),
    );
  }

  addControls(selectedControls: string[]) {
    if (!selectedControls?.length) {
      return;
    }
    const registers = this.paramsStore.value['registers'];
    const coilTypes = ['switch', 'alarm', 'pushbutton'];
    let newRegs: AllRegisters = {
      coils: [],
      discretes: [],
      holdings: [],
      inputs: [],
    };

    selectedControls.forEach((cellId: string) => {
      const cell = this.#devicesStore.cells.get(cellId);

      if (coilTypes.includes(cell.type)) {
        const arrayType = cell.readOnly ? 'discretes' : 'coils';
        newRegs[arrayType].push(this.#makeSingleBitRegisterBinding(cellId));
      } else {
        const arrayType = cell.readOnly ? 'inputs' : 'holdings';
        if (cell.type === 'text') {
          newRegs[arrayType].push(this.#makeWordRegisterBinding(cellId, 'varchar'));
        } else {
          newRegs[arrayType].push(this.#makeWordRegisterBinding(cellId, 'signed'));
        }
      }
    });

    this.#mergeRegs(registers, newRegs, 'coils');
    this.#mergeRegs(registers, newRegs, 'discretes');
    this.#mergeRegs(registers, newRegs, 'holdings');
    this.#mergeRegs(registers, newRegs, 'inputs');

    this.paramsStore.params['registers'].setValue(registers);
  }

  checkAllControlsConfigured(): boolean {
    if (!this.paramsStore?.value) {
      return false;
    }
    const registers = this.paramsStore.value['registers'];
    const configuredControls = Object.values(registers).flatMap((arr: any) =>
      arr.map((reg: Register) => reg['topic']),
    );
    return Array.from(this.#devicesStore.filteredDevices.values()).every(
      (device: Device) => Array.from(device.cells).every((cellId) => configuredControls.includes(cellId)),
    );
  }

  get isDirty() {
    return this.paramsStore.isDirty;
  }

  get allowSave() {
    return this.isDirty && !this.paramsStore.hasErrors;
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
