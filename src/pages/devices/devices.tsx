import LZString from 'lz-string';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import StatsIcon from '@/assets/icons/stats.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Card } from '@/components/card';
import { Cell } from '@/components/cell';
import { Confirm } from '@/components/confirm';
import { PageLayout } from '@/layouts/page';
import { DeviceStore, Device } from '@/stores/device';
import './styles.css';

const DevicesPage = observer(({ store, isHaveRights }: { store: DeviceStore; isHaveRights: boolean }) => {
  const { t } = useTranslation();
  const pageWrapper = useRef();
  const [pageWidth, setPageWidth] = useState();
  const [deletedDeviceId, setDeletedDeviceId] = useState<string | null>(null);
  const [devicesInColumns, setDevicesInColumns] = useState([]);

  if (!localStorage.getItem('visibleDevices')) {
    localStorage.setItem('visibleDevices', JSON.stringify({ devices: {} }));
  }

  const redirectToChart = (deviceId: string) => {
    const data = { c: store.devices.get(deviceId).cellIds.map((cell) => ({ d: deviceId, c: cell.split('/')[1] })) };
    const encodedUrl = encodeURIComponent(LZString.compressToEncodedURIComponent(JSON.stringify(data)));
    location.assign(`#!/history/${encodedUrl}`);
  };

  const actions = [
    {
      title: t('devices.labels.delete'), action: (id: string) => setDeletedDeviceId(id), icon: TrashIcon,
    },
    {
      title: '', action: redirectToChart, icon: StatsIcon,
    },
  ];

  const getDevicesColumnsCount = () => {
    const devicePanelWidth = 380;
    const columnCount = Math.floor(pageWidth as number / devicePanelWidth);
    return columnCount || 1;
  };

  const splitDevicesIntoColumns = () => {
    const columnCount = getDevicesColumnsCount();
    const devicesArray = Array.from({ length: columnCount }, () => []);

    let index = 0;
    store.filteredDevices.forEach((device) => {
      devicesArray[index].push(device);
      index = (index + 1) % columnCount;
    });
    setDevicesInColumns(devicesArray);
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.contentBoxSize && entry.contentBoxSize.length) {
          setPageWidth(entry.contentBoxSize[0].inlineSize as any);
          splitDevicesIntoColumns();
        }
      });
    });

    if (pageWrapper.current) {
      resizeObserver.observe(pageWrapper.current);
    }

    return () => {
      if (pageWrapper.current) {
        resizeObserver.unobserve(pageWrapper.current);
      }
    };
  }, [pageWrapper, pageWidth]);

  useEffect(() => {
    splitDevicesIntoColumns();
  }, [store.filteredDevices.size]);

  return (
    <PageLayout title={t('devices.title')} isHaveRights={isHaveRights}>
      <section className="devices-container" ref={pageWrapper}>
        {store.filteredDevices.size ? (
          devicesInColumns.map((column, i) => (
            <div className="devices-column" key={i}>
              {column.map((device: Device) => (
                <Card
                  heading={device.name}
                  id={device.id}
                  actions={actions}
                  toggleBody={() => device.toggleDeviceVisibility()}
                  isBodyVisible={device.isVisible}
                  key={device.id}
                >
                  {store.getDeviceCells(device.id).map((cell) => (
                    <Cell cell={cell} key={cell.id} />
                  ))}
                </Card>
              ))}
            </div>
          ))
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
          components={[<b />]}
        />
      </Confirm>
    </PageLayout>
  );
});

export default DevicesPage;
