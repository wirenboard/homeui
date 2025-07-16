import { DeviceSettingsObjectStore } from '@/stores/device-manager';
import { Translator } from '@/stores/json-schema-editor';

export interface DeviceSettingsEditorProps {
  store: DeviceSettingsObjectStore;
  translator: Translator;
}
