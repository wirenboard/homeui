import { type DeviceSettingsObjectStore, type WbDeviceParameterEditorsGroup } from '@/stores/device-manager';
import { type ArrayStore, type Translator } from '@/stores/json-schema-editor';

export interface DeviceSettingsEditorProps {
  store: DeviceSettingsObjectStore;
  translator: Translator;
}

export interface DeviceSettingsTabsProps {
  groups: WbDeviceParameterEditorsGroup[];
  customChannelsStore?: ArrayStore;
  translator: Translator;
}
