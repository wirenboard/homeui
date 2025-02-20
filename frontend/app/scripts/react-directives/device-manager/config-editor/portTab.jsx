import React from 'react';
import { Button, ErrorBar } from '../../common';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import JsonEditor from '../../components/json-editor/jsonEditor';
import { useMediaQuery } from 'react-responsive';
import CollapseButton from '../../components/buttons/collapseButton';

export const PortTab = observer(({ tab }) => {
  const isMobile = useMediaQuery({ maxWidth: 991 });
  return (
    <div className={'port-tab' + (tab.hasInvalidConfig ? ' error' : '')}>
      {tab.hasChildren && (
        <CollapseButton state={tab.collapseButtonState} stopPropagation={isMobile} />
      )}
      <span>{tab.name}</span>
      {tab.hasInvalidConfig && <i className="glyphicon glyphicon-exclamation-sign"></i>}
    </div>
  );
});

export const PortTabContent = ({ tab, index, onDeleteTab, onDeletePortDevices }) => {
  const { t } = useTranslation();
  return (
    <div>
      {tab.childrenHasInvalidConfig && <ErrorBar msg={t('device-manager.errors.device-config')} />}
      <div className="port-tab-content-header">
        <span>{tab.title}</span>
        <div className="button-panel">
          <Button
            key="delete-devices"
            label={t('device-manager.buttons.delete-devices')}
            type="danger"
            onClick={() => onDeletePortDevices(tab)}
            disabled={!tab.hasChildren}
          />
          {tab.canDelete && (
            <Button
              key="delete-port"
              label={t('device-manager.buttons.delete-port')}
              type="danger"
              onClick={onDeleteTab}
            />
          )}
        </div>
      </div>
      <JsonEditor
        schema={tab.schema}
        data={tab.editedData}
        root={'port' + index}
        onChange={tab.setData}
      />
    </div>
  );
};
