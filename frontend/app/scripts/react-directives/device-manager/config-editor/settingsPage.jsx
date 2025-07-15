import { JsonSchemaEditor } from '@/components/json-schema-editor';

export const SettingsTab = ({ tab }) => {
  return (
    <div className="settings-tab">
      <span>{tab.name}</span>
      {tab.hasInvalidConfig && <i className="glyphicon glyphicon-exclamation-sign"></i>}
    </div>
  );
};

export const SettingsTabContent = ({ tab }) => {
  return (
    <JsonSchemaEditor store={tab.schemaStore} translator={tab.schemaTranslator}/>
  );
};
