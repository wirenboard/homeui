import { ObjectStore, DeviceSettingsObjectStore } from '@/stores/json-schema-editor';
import { DeviceSettingsEditor } from './device-settings-editor';
import { ObjectParamEditor } from './object-param-editor';
import type { JsonSchemaEditorProps } from './types';
import './styles.css';

export const JsonSchemaEditor = ({ store, translator }: JsonSchemaEditorProps) => {
  return (
    <div className="wb-jsonEditor">
      {store && store instanceof DeviceSettingsObjectStore ? (
        <DeviceSettingsEditor store={store} translator={translator} />
      ) : (
        <ObjectParamEditor store={store as ObjectStore} translator={translator} />
      )}
    </div>
  );
};
