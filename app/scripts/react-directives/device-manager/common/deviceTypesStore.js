'use strict';

import firmwareIsNewer from '../../../utils/fwUtils';

class DeviceTypesStore {
  constructor(loadDeviceSchemaFn) {
    this.loadDeviceSchemaFn = loadDeviceSchemaFn;
    this.deviceTypesMap = {};
    this.deviceTypeSelectOptions = [];
  }

  setDeviceTypeGroups(deviceTypeGroups) {
    this.deviceTypeSelectOptions = deviceTypeGroups.map(deviceTypeGroup => {
      return {
        label: deviceTypeGroup.name,
        options: deviceTypeGroup.types.map(deviceType => {
          return { label: deviceType.name, value: deviceType.type, hidden: deviceType.deprecated };
        }),
      };
    });

    this.deviceTypesMap = deviceTypeGroups.reduce((groupsAcc, deviceTypeGroup) => {
      return deviceTypeGroup.types.reduce((typesAcc, deviceType) => {
        typesAcc[deviceType.type] = deviceType;
        return typesAcc;
      }, groupsAcc);
    }, {});
  }

  async getSchema(deviceType) {
    if (this.deviceTypesMap[deviceType]?.schema) {
      return this.deviceTypesMap[deviceType]?.schema;
    }
    let schema = await this.loadDeviceSchemaFn(deviceType);
    this.deviceTypesMap[deviceType].schema = schema;
    return schema;
  }

  findDeviceType(deviceSignature, fw) {
    let lastFwVersion = undefined;
    let deviceType = undefined;
    Object.entries(this.deviceTypesMap).forEach(([typeName, desc]) => {
      desc.hw?.forEach(hw => {
        if (
          hw.signature == deviceSignature &&
          firmwareIsNewer(hw.fw, fw) &&
          firmwareIsNewer(lastFwVersion, hw.fw)
        ) {
          lastFwVersion = hw.fw;
          deviceType = typeName;
        }
      });
    });
    return deviceType;
  }

  getName(deviceType) {
    return this.deviceTypesMap[deviceType]?.name;
  }

  isDeprecated(deviceType) {
    const desc = this.deviceTypesMap[deviceType];
    return desc === undefined ? false : desc.deprecated;
  }

  isUnknown(deviceType) {
    return !this.deviceTypesMap.hasOwnProperty(deviceType);
  }

  isModbusDevice(deviceType) {
    return this.deviceTypesMap[deviceType]?.protocol == 'modbus';
  }

  getDeviceSignatures(deviceType) {
    const typeDesc = this.deviceTypesMap[deviceType];
    if (typeDesc?.hw) {
      return typeDesc.hw.map(hw => hw.signature);
    }
    return [];
  }

  getDefaultId(deviceType, slaveId) {
    const id = this.deviceTypesMap[deviceType]?.['mqtt-id'] || deviceType;
    return `${id}_${slaveId}`;
  }
}

export default DeviceTypesStore;
