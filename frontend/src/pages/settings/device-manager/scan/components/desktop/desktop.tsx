import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { CollapseButton } from '@/components/collapse-button';
import { BooleanField } from '@/components/form';
import { Table, TableCell, TableRow } from '@/components/table';
import { Tag } from '@/components/tag';
import { DeviceName, Port, SlaveId } from '../common';
import type { AlreadyConfiguredDevicesHeaderProps, DeviceRowProps, DevicesTableProps } from './types';
import './styles.css';

const DeviceRow = observer(({ isScanning, deviceStore }: DeviceRowProps) => {
  return (
    <>
      <TableRow
        className={classNames({
          'deviceRow-withError': !!deviceStore?.scannedDevice?.fw?.update?.error,
          'deviceRow-notSelectable': !deviceStore.selectable,
        })}
      >
        <TableCell className="deviceRow-titleCell">
          <DeviceName
            title={deviceStore.title}
            bootloaderMode={deviceStore.bootloaderMode}
            errors={deviceStore?.scannedDevice?.errors}
            duplicateMqttTopic={deviceStore.duplicateMqttTopic}
            unknownType={deviceStore.isUnknownType}
            selected={deviceStore.selected}
            otherMatchingDeviceTypesNames={deviceStore.names.slice(1)}
            selectable={deviceStore.selectable}
            isScanning={isScanning}
            onSelectionChange={(val: boolean) => deviceStore.setSelected(val)}
          />
        </TableCell>
        <TableCell verticalAlign="top">{deviceStore.sn}</TableCell>
        <TableCell verticalAlign="top">
          <SlaveId slaveId={deviceStore.address} isDuplicate={deviceStore.duplicateSlaveId} />
        </TableCell>
        <TableCell verticalAlign="top">
          <Port
            path={deviceStore.port}
            baudRate={deviceStore.baudRate}
            dataBits={deviceStore.dataBits}
            parity={deviceStore.parity}
            stopBits={deviceStore.stopBits}
            misconfiguredPort={deviceStore.misconfiguredPort}
          />
        </TableCell>
      </TableRow>

      {!!deviceStore?.scannedDevice?.fw?.update?.error && (
        <TableRow>
          <TableCell colSpan={5}>
            <Tag variant="danger">{deviceStore?.scannedDevice?.fw?.update?.error}</Tag>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

const AlreadyConfiguredDevicesHeader = observer(({
  alreadyConfiguredDevices,
  collapseButtonState,
}: AlreadyConfiguredDevicesHeaderProps) => {
  const { t } = useTranslation();
  if (!alreadyConfiguredDevices.length) {
    return null;
  }
  return (
    <TableRow isHeading>
      <TableCell
        className="alreadyConfigured-devicesHeader"
        colSpan={4}
      >
        <div className="alreadyConfigured-wrapper">
          <CollapseButton state={collapseButtonState} />
          <div onClick={() => collapseButtonState.setCollapsed(!collapseButtonState.collapsed)}>
            {t('scan.labels.device-in-config')}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
},
);

export const DevicesTable = observer(({
  isScanning,
  newDevices,
  alreadyConfiguredDevices,
  collapseButtonState,
  selectionValue,
  toggleSelection,
}: DevicesTableProps) => {
  const { t } = useTranslation();
  return (
    <Table className="devicesTable">
      <TableRow isHeading>
        <TableCell width="44%">
          <div className="devicesTable-checkboxWrapper">
            <BooleanField
              title={t('scan.labels.device')}
              view="checkbox"
              isDisabled={isScanning || !newDevices.length}
              indeterminate={selectionValue === 'indeterminate'}
              value={!!selectionValue}
              onChange={(val) => toggleSelection(val)}
            />
          </div>
        </TableCell>
        <TableCell width="14%">{t('scan.labels.sn')}</TableCell>
        <TableCell width="15%">{t('scan.labels.address')}</TableCell>
        <TableCell width="27%">{t('scan.labels.port')}</TableCell>
      </TableRow>
      {newDevices.map((device) => (
        <DeviceRow isScanning={isScanning} key={device.uuid} deviceStore={device} />
      ))}
      <AlreadyConfiguredDevicesHeader
        alreadyConfiguredDevices={alreadyConfiguredDevices}
        collapseButtonState={collapseButtonState}
      />
      {!collapseButtonState.collapsed && alreadyConfiguredDevices.map((device, index) => (
        <DeviceRow isScanning={isScanning} key={index} deviceStore={device} />
      ))}
    </Table>
  );
});
