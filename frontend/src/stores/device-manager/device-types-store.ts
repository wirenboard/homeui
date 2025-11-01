import { firmwareIsNewer } from '~/utils/fwUtils';
import type { DeviceTypeDescription, DeviceTypeDropdownOptionGroup, DeviceTypeDescriptionGroup } from './types';

export class DeviceTypesStore {
  public deviceTypeDropdownOptions: DeviceTypeDropdownOptionGroup[];
  private _loadDeviceSchemaFn: (deviceType: string) => Promise<any>;
  private _deviceTypesMap: Map<string, DeviceTypeDescription>;

  constructor(loadDeviceSchemaFn: (deviceType: string) => Promise<any>) {
    this._loadDeviceSchemaFn = loadDeviceSchemaFn;
    this._deviceTypesMap = new Map<string, DeviceTypeDescription>();
    this.deviceTypeDropdownOptions = [];
  }

  setDeviceTypeGroups(deviceTypeGroups: DeviceTypeDescriptionGroup[]) {
    this.deviceTypeDropdownOptions = deviceTypeGroups.map((deviceTypeGroup) => {
      return {
        label: deviceTypeGroup.name,
        options: deviceTypeGroup.types.map((deviceType) => {
          return { label: deviceType.name, value: deviceType.type, hidden: deviceType.deprecated };
        }),
      };
    });
    this._deviceTypesMap = deviceTypeGroups.reduce((groupsAcc, deviceTypeGroup) => {
      return deviceTypeGroup.types.reduce((typesAcc, deviceType) => {
        typesAcc.set(deviceType.type, deviceType);
        return typesAcc;
      }, groupsAcc);
    }, new Map<string, DeviceTypeDescription>());
  }

  async getSchema(deviceType: string) {
    const typeDesc = this._deviceTypesMap.get(deviceType);
    if (!typeDesc) {
      return undefined;
    }
    if (!typeDesc?.schema) {
      const schema = await this._loadDeviceSchemaFn(deviceType);
      typeDesc.schema = schema;
    }
    return typeDesc.schema;
  }

  findNotDeprecatedDeviceTypes(deviceSignature: string, fw: string) {
    // Filter only not deprecated types with the same signature and older or equal firmware
    let deviceTypes = Array.from(this._deviceTypesMap.entries()).filter(([_typeName, desc]) => {
      return (
        !desc.deprecated &&
        desc.hw?.some((hw) => hw.signature === deviceSignature && !firmwareIsNewer(fw, hw.fw))
      );
    });

    // Find closest firmware
    let closestFw: string | undefined;
    deviceTypes.forEach(([_typeName, desc]) => {
      desc.hw?.forEach((hw) => {
        if (hw.signature === deviceSignature && firmwareIsNewer(closestFw, hw.fw)) {
          closestFw = hw.fw;
        }
      });
    });

    // Return device types with the closest firmware
    return deviceTypes
      .filter(([_typeName, desc]) =>
        desc.hw?.some((hw) => hw.signature === deviceSignature && closestFw === hw.fw)
      )
      .map(([typeName, _desc]) => typeName)
      .sort();
  }

  getName(deviceType: string) {
    return this._deviceTypesMap.get(deviceType)?.name;
  }

  isDeprecated(deviceType: string) {
    const typeDesc = this._deviceTypesMap.get(deviceType);
    return typeDesc === undefined ? false : typeDesc.deprecated;
  }

  isUnknown(deviceType: string) {
    return !this._deviceTypesMap.has(deviceType);
  }

  isModbusDevice(deviceType: string) {
    return this._deviceTypesMap.get(deviceType)?.protocol === 'modbus';
  }

  getDeviceSignatures(deviceType: string) {
    const typeDesc = this._deviceTypesMap.get(deviceType);
    if (typeDesc?.hw) {
      return typeDesc.hw.map((hw) => hw.signature);
    }
    return [];
  }

  getDefaultId(deviceType: string, slaveId: string) {
    const id = this._deviceTypesMap.get(deviceType)?.['mqtt-id'] || deviceType;
    return `${id}_${slaveId}`;
  }

  isWbDevice(deviceType: string) {
    return !!this._deviceTypesMap.get(deviceType)?.hw;
  }

  withSubdevices(deviceType: string) {
    return !!this._deviceTypesMap.get(deviceType)?.['with-subdevices'];
  }
}
