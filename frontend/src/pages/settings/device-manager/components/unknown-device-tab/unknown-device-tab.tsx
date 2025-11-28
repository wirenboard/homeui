import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { type DeviceTabStore } from '@/stores/device-manager';

export const UnknownDeviceTabContent = observer(
  ({ tab, onDeleteTab } : { tab: DeviceTabStore; onDeleteTab: () => void }) => {
    const { t } = useTranslation();
    return (
      <div className="deviceTab-content">
        <Alert variant="danger" className="alert-withButton">
          <span>
            {t('device-manager.errors.unknown-device-type', { type: tab.deviceType })}
          </span>
          <Button label={t('device-manager.buttons.delete')} variant="danger" onClick={onDeleteTab} />
        </Alert>
        <pre>{JSON.stringify(tab.editedData, null, 2)}</pre>
      </div>
    );
  });
