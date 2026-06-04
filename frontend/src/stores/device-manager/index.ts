export { WbDeviceChannelEditor } from './device-tab/device-settings-editor/channel-editor-store';
export {
  DeviceSettingsObjectStore,
  WbDeviceParameterEditorsGroup
} from './device-tab/device-settings-editor/device-settings-store';
export { WbDeviceParameterEditor } from './device-tab/device-settings-editor/parameter-editor-store';
export { DeviceTabStore } from './device-tab/device-tab-store';
export {
  EmbeddedSoftware,
  EmbeddedSoftwareComponent,
  ComponentFirmware
} from './device-tab/embedded-software/embedded-software-store';
export { ReadRegistersStateStore } from './device-tab/read-registers-state';
export { ReadRegistersState } from './device-tab/types';
export { DeviceTypesStore } from './device-types-store';

export {
  toDmRpcPortConfig,
  toSerialRpcPortConfig,
  setupDevice,
  getIntAddress
} from './utils/common';

export {
  firmwareIsNewer,
  firmwareIsNewerOrEqual
} from './utils/firmware';
