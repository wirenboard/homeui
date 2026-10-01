import { type DeviceSettingsObjectStore, type WbDeviceParameterEditorsGroup } from '@/stores/device-manager';
import { type ArrayStore, type ExactNumberStore, type Translator } from '@/stores/json-schema-editor';

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
  store: ExactNumberStore;
  translator: Translator;
}
