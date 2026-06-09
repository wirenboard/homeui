import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import CodeIcon from '@/assets/icons/code.svg';
import CollapseIcon from '@/assets/icons/collapse.svg';
import ExpandIcon from '@/assets/icons/expand.svg';
import ModbusIcon from '@/assets/icons/modbus.svg';
import SystemDeviceIcon from '@/assets/icons/system-device.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import ZigbeeIcon from '@/assets/icons/zigbee.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Cell } from '@/components/cell';
import { ColumnsWrapper } from '@/components/columns-wrapper';
import { Confirm } from '@/components/confirm';
import { Dropdown, type Option } from '@/components/dropdown';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { devicesStore, DeviceType } from '@/stores/devices';
import './styles.css';

const DevicesPage = observer(() => {
  const { t } = useTranslation();
  const [deletedDeviceId, setDeletedDeviceId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const typeFilterMap: Record<string, DeviceType> = {
    system: DeviceType.System,
    virtual: DeviceType.Virtual,
    modbus: DeviceType.Modbus,
    zigbee: DeviceType.Zigbee,
  };

  const typeLabelKeys: Record<string, string> = {
    system: 'devices.labels.type-system',
    virtual: 'devices.labels.type-virtual',
    modbus: 'devices.labels.type-modbus',
    zigbee: 'devices.labels.type-zigbee',
  };

  const presentTypes = new Set(
    Array.from(devicesStore.filteredDevices.values()).map((device) => device.type),
  );
  const typeOptions = [
    { value: null, label: t('devices.labels.all-devices') },
    ...Object.entries(typeFilterMap)
      .filter(([_, type]) => presentTypes.has(type))
      .map(([key]) => ({ value: key, label: t(typeLabelKeys[key]) })),
  ];

  const displayedDevices = typeFilter
    ? new Map(
      Array.from(devicesStore.filteredDevices.entries())
        .filter(([_, device]) => device.type === typeFilterMap[typeFilter]),
    )
    : devicesStore.filteredDevices;

  if (!localStorage.getItem('foldedDevices')) {
    localStorage.setItem('foldedDevices', JSON.stringify([]));
  }

  const actions = [
    {
      title: t('devices.labels.delete'),
      action: (id: string) => setDeletedDeviceId(id),
      icon: TrashIcon,
      isPopupAction: true,
    },
  ];

  return (
    <PageLayout
      title={t('devices.title')}
      hasRights={authStore.hasRights(UserRole.Operator)}
      actions={
        <>
          {typeOptions.length > 2 && (
            <Dropdown
              value={typeFilter}
              options={typeOptions}
              ariaLabel={t('devices.labels.filter-type')}
              onChange={(option: Option<string>) => setTypeFilter(option?.value ?? null)}
            />
          )}
          <Tooltip
            text={devicesStore.hasOpenedDivices ? t('devices.labels.collapse') : t('devices.labels.expand')}
          >
            <Button
              variant="secondary"
              aria-label={devicesStore.hasOpenedDivices ? t('devices.labels.collapse') : t('devices.labels.expand')}
              icon={devicesStore.hasOpenedDivices ? <CollapseIcon /> : <ExpandIcon />}
              onClick={devicesStore.toggleDevices}
            />
          </Tooltip>
        </>
      }
    >
      <section className="devices">
        {displayedDevices.size ? (
          <ColumnsWrapper
            columnClassName="devices-column"
            baseColumnWidth={376}
          >
            {Array.from(displayedDevices).map(([deviceId, device]) => (
              <Card
                heading={
                  <span className="devices-deviceHeader">
                    {device.name}
                    {device.type === DeviceType.Virtual && <CodeIcon className="devices-icon" />}
                    {device.type === DeviceType.System && <SystemDeviceIcon className="devices-icon" />}
                    {device.type === DeviceType.Modbus && <ModbusIcon className="devices-icon" />}
                    {device.type === DeviceType.Zigbee && <ZigbeeIcon className="devices-icon" />}
                  </span>
                }
                id={deviceId}
                actions={actions}
                toggleBody={device.toggleDeviceVisibility}
                isBodyVisible={device.isVisible}
                key={device.id}
              >
                {devicesStore.getDeviceCells(device.id).map((cell) => (
                  <Cell
                    cell={cell}
                    key={cell.id}
                  />
                ))}
              </Card>
            ))}
          </ColumnsWrapper>
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
          devicesStore.deleteDevice(deletedDeviceId);
          setDeletedDeviceId(null);
        }}
      >
        <Trans
          i18nKey="devices.prompt.delete-description"
          values={{
            name: devicesStore.devices.get(deletedDeviceId)?.name,
          }}
          components={[<b key="device-name" />]}
          shouldUnescape
        />
      </Confirm>
    </PageLayout>
  );
});

export default DevicesPage;
