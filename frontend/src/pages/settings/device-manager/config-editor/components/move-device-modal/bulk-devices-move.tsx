import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { BooleanField, OptionsField } from '@/components/form';
import { Table, TableCell, TableRow } from '@/components/table';
import { type DeviceTabStore } from '@/stores/device-manager';
import { type BulkDevicesMoveProps } from './types';

export const BulkDevicesMove = ({
  isOpened, currentPort, devices, targetPortOptions, onMove, onClose,
}: BulkDevicesMoveProps) => {
  const { t } = useTranslation();
  const [targetPort, setTargetPort] = useState(targetPortOptions[0]?.value);
  const [selected, setSelected] = useState<Set<DeviceTabStore>>(new Set());

  const allSelected = !!devices.length && devices.every((device) => selected.has(device));

  const toggleSelected = (device: DeviceTabStore, isSelected: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isSelected) {
        next.add(device);
      } else {
        next.delete(device);
      }
      return next;
    });
  };

  const toggleSelectAll = (isSelected: boolean) => {
    setSelected(isSelected ? new Set(devices) : new Set());
  };

  return (
    <Confirm
      isOpened={isOpened}
      width={700}
      heading={t('device-manager.labels.move-devices', { port: currentPort.name })}
      acceptLabel={t('device-manager.buttons.move')}
      isDisabled={!targetPort || !selected.size}
      confirmCallback={() => onMove(new Map(Array.from(selected, (device) => [device, targetPort])))}
      closeCallback={() => onClose()}
    >
      <div className="moveDevicesModal-container">
        {!!devices.length && (
          <Table isFullWidth>
            <TableRow isHeading isSticky>
              <TableCell>
                <BooleanField
                  view="checkbox"
                  title={t('device-manager.labels.select-all')}
                  value={allSelected}
                  hideLabel
                  onChange={toggleSelectAll}
                />
              </TableCell>
              <TableCell>{t('device-manager.labels.address')}</TableCell>
              <TableCell>{t('device-manager.labels.device-type')}</TableCell>
            </TableRow>
            {devices.map((device) => (
              <TableRow key={device.mqttId}>
                <TableCell>
                  <BooleanField
                    view="checkbox"
                    title={device.name}
                    value={selected.has(device)}
                    hideLabel
                    onChange={(isSelected: boolean) => toggleSelected(device, isSelected)}
                  />
                </TableCell>
                <TableCell>{device.slaveId ?? '—'}</TableCell>
                <TableCell>{device.deviceTypesStore.getName(device.deviceType)}</TableCell>
              </TableRow>
            ))}
          </Table>
        )}

        <OptionsField
          title={t('device-manager.labels.target-port')}
          value={targetPort}
          options={targetPortOptions}
          isSearchable
          onChange={(value: string) => setTargetPort(value)}
        />
      </div>
    </Confirm>
  );
};
