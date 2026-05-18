import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { CollapseButton } from '@/components/collapse-button';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import { type PortTabProps } from './types';
import './styles.css';

const WarnIcon = lazy(() => import('@/assets/icons/warn.svg'));

export const PortTab = observer(({ tab }: PortTabProps) => {
  const isMobile = useMediaQuery({ maxWidth: 991 });
  return (
    <div
      className={classNames('portTab', {
        'portTab-error': tab.hasInvalidConfig,
      })}
    >
      {tab.hasChildren && (
        <CollapseButton state={tab.collapseButtonState} stopPropagation={isMobile} />
      )}
      <span className="portTab-title">{tab.name}</span>
      {tab.hasInvalidConfig && <WarnIcon className="portTab-icon" />}
    </div>
  );
});

export const PortTabContent = ({ tab, onDeleteTab, onDeletePortDevices }) => {
  const { t } = useTranslation();
  return (
    <div>
      {tab.childrenHasInvalidConfig && (
        <Alert className="portTab-error" variant="danger">
          {t('device-manager.errors.device-config')}
        </Alert>
      )}
      <header className="portTab-header">
        <span className="portTab-headerTitle">{tab.title}</span>
        <div className="portTab-buttonPanel">
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
