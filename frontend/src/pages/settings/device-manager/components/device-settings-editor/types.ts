import { type DeviceSettingsObjectStore, type WbDeviceParameterEditorsGroup } from '@/stores/device-manager';
import { type ArrayStore, type Translator, type NumberStore } from '@/stores/json-schema-editor';

export interface DeviceSettingsEditorProps {
  store: DeviceSettingsObjectStore;
  translator: Translator;
  showChannels?: boolean;
}

export interface DeviceSettingsTabsProps {
  groups: WbDeviceParameterEditorsGroup[];
  customChannelsStore?: ArrayStore;
  translator: Translator;
  showChannels: boolean;
}

export interface BadValueFromRegisterWarningProps {
  id: string;
  store: NumberStore;
  translator: Translator;
}
