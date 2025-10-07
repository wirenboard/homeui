import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import CollapseIcon from '@/assets/icons/collapse.svg';
import ExpandIcon from '@/assets/icons/expand.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Cell } from '@/components/cell';
import { ColumnsWrapper } from '@/components/columns-wrapper';
import { Confirm } from '@/components/confirm';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { DeviceStore } from '@/stores/device';
import './styles.css';

const DevicesPage = observer(({ store, hasRights }: { store: DeviceStore; hasRights: boolean }) => {
  const { t } = useTranslation();
  const [deletedDeviceId, setDeletedDeviceId] = useState<string | null>(null);

  if (!localStorage.getItem('foldedDevices')) {
    localStorage.setItem('foldedDevices', JSON.stringify([]));
  }

  const actions = [
    {
      title: t('devices.labels.delete'), action: (id: string) => setDeletedDeviceId(id), icon: TrashIcon,
    },
  ];

  return (
    <PageLayout
      title={t('devices.title')}
      hasRights={hasRights}
      actions={
        <Tooltip
          text={store.hasOpenedDivices ? t('devices.labels.collapse') : t('devices.labels.expand')}
        >
          <Button
            variant="secondary"
            icon={store.hasOpenedDivices ? <CollapseIcon /> : <ExpandIcon />}
            onClick={store.toggleDevices}
          />
        </Tooltip>
      }
    >
      <section className="devices">
        {store.filteredDevices.size ? (
          <ColumnsWrapper
            items={Array.from(store.filteredDevices)}
            columnClassName="devices-column"
            renderItem={([_deviceId, device]) => (
              <Card
                heading={device.name}
                id={device.id}
                actions={actions}
                toggleBody={device.toggleDeviceVisibility}
                isBodyVisible={device.isVisible}
                key={device.id}
              >
                {store.getDeviceCells(device.id).map((cell) => (
                  <Cell
                    cell={cell}
                    key={cell.id}
                  />
                ))}
              </Card>
            )}
            baseColumnWidth={376}
          />
        ) : (
          <Alert variant="info">
            {t('devices.labels.nothing')}
          </Alert>
        )}
      </section>

      <Confirm
        isOpened={!!deletedDeviceId}
        heading={t('devices.prompt.delete-title')}
        variant="danger"
        closeCallback={() => setDeletedDeviceId(null)}
        confirmCallback={() => {
          store.deleteDevice(deletedDeviceId);
          setDeletedDeviceId(null);
        }}
      >
        <Trans
          i18nKey="devices.prompt.delete-description"
          values={{
            name: store.devices.get(deletedDeviceId)?.name,
          }}
          components={[<b key="device-name" />]}
          shouldUnescape
        />
      </Confirm>
    </PageLayout>
  );
});

export default DevicesPage;
