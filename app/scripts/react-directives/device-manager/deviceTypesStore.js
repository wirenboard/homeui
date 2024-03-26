'use strict';

import firmwareIsNewer from '../../utils/fwUtils';

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
        typesAcc[deviceType.type] = {
          name: deviceType.name,
          isDeprecated: deviceType.deprecated,
          hw: deviceType.hw,
        };
        return typesAcc;
      }, groupsAcc);
    }, this.deviceTypesMap);
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
    return desc === undefined ? false : desc.isDeprecated;
  }

  isUnknown(deviceType) {
    return !this.deviceTypesMap.hasOwnProperty(deviceType);
  }
}

export default DeviceTypesStore;
