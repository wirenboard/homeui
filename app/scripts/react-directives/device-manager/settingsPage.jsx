import React from 'react';
import JsonEditor from '../components/json-editor/jsonEditor';

export const SettingsTab = ({ tab }) => {
  return (
    <div className="settings-tab">
      <span>{tab.name}</span>
      {!tab.isValid && <i className="glyphicon glyphicon-exclamation-sign"></i>}
    </div>
  );
};

export const SettingsTabContent = ({ tab, index }) => {
  return (
    <JsonEditor
      schema={tab.schema}
      data={tab.editedData}
      root={'set' + index}
      onChange={tab.setData}
    />
  );
};
