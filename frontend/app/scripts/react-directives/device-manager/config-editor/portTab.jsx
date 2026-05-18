import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { CollapseButton } from '@/components/collapse-button';
import { Button } from '@/components/button';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import { ErrorBar } from '../../common';

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

export const PortTabContent = ({ tab, onDeleteTab, onDeletePortDevices }) => {
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
            variant="danger"
            disabled={!tab.hasChildren}
            aria-haspopup="dialog"
            onClick={() => onDeletePortDevices(tab)}
          />
          {tab.canDelete && (
            <Button
              key="delete-port"
              label={t('device-manager.buttons.delete-port')}
              variant="danger"
              onClick={onDeleteTab}
            />
          )}
        </div>
      </div>
      <JsonSchemaEditor store={tab.schemaStore} translator={tab.schemaTranslator}/>
    </div>
  );
};
