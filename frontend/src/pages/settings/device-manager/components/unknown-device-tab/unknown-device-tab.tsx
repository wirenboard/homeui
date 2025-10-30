import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { DeviceTabStore } from '@/stores/device-manager';

export const UnknownDeviceTabContent = observer(
  ({ tab, onDeleteTab } : { tab: DeviceTabStore; onDeleteTab: () => void }) => {
    const { t } = useTranslation();
    return (
      <>
        <Alert variant="danger">
          {t('device-manager.errors.unknown-device-type', { type: tab.deviceType })}
          <Button label={t('device-manager.buttons.delete')} variant="danger" onClick={onDeleteTab} />
        </Alert>
        <pre>{JSON.stringify(tab.data, null, 2)}</pre>
      </>
    );
  });
