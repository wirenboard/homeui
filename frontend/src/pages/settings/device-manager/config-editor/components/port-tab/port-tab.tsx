import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import WarnIcon from '@/assets/icons/warn.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { CollapseButton } from '@/components/collapse-button';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import { type PortTabProps } from './types';
import './styles.css';

export const PortTab = observer(({ tab }: PortTabProps) => {
  return (
    <div
      className={classNames('portTab', {
        'portTab-error': tab.hasInvalidConfig,
      })}
    >
      <CollapseButton
        className="portTab-collapse"
        state={tab.collapseButtonState}
        isDisabled={!tab.hasChildren}
        stopPropagation
      />
      <span className="portTab-title">{tab.name}</span>
      {tab.hasInvalidConfig && <WarnIcon className="portTab-icon" />}
    </div>
  );
});

export const PortTabContent = ({ tab, onDeleteTab, onDeletePortDevices, onMovePortDevices }) => {
  const { t } = useTranslation();
  return (
    <div>
      {tab.childrenHasInvalidConfig && (
        <Alert className="portTab-errorAlert" variant="danger">
          {t('device-manager.errors.device-config')}
        </Alert>
      )}
      <header className="portTab-header">
        <span className="portTab-headerTitle">{tab.title}</span>
        <div className="portTab-buttonPanel">
          <Button
            key="move-devices"
            label={t('device-manager.buttons.move-devices')}
            variant="secondary"
            disabled={!tab.hasChildren}
            aria-haspopup="dialog"
            onClick={() => onMovePortDevices(tab)}
          />
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
      </header>
      <JsonSchemaEditor store={tab.schemaStore} translator={tab.schemaTranslator}/>
    </div>
  );
};
