import { WbDeviceChannelEditor } from './device-tab/device-settings-editor/channel-editor-store';
import {
  DeviceSettingsObjectStore,
  WbDeviceParameterEditorsGroup,
} from './device-tab/device-settings-editor/device-settings-store';
import { WbDeviceParameterEditor } from './device-tab/device-settings-editor/parameter-editor-store';
import { DeviceTabStore } from './device-tab/device-tab-store';
import {
  EmbeddedSoftware,
  EmbeddedSoftwareComponent,
  ComponentFirmware,
} from './device-tab/embedded-software/embedded-software-store';
import { ReadRegistersState } from './device-tab/types';
import { DeviceTypesStore } from './device-types-store';

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

export {
  DeviceSettingsObjectStore,
  WbDeviceParameterEditorsGroup,
  WbDeviceParameterEditor,
  WbDeviceChannelEditor,
  EmbeddedSoftware,
  EmbeddedSoftwareComponent,
  ComponentFirmware,
  DeviceTabStore,
  DeviceTypesStore,
  ReadRegistersState
};
