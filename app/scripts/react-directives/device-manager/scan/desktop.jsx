import React from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceName, Port, SlaveId } from './common';
import { Checkbox } from '../../common';
import { observer } from 'mobx-react-lite';

function ErrorRow({ error }) {
  if (!error) {
    return;
  }
  return (
    <tr>
      <td colSpan="5">
        <div className="tag bg-danger">{error}</div>
      </td>
    </tr>
  );
}

const DeviceRow = observer(({ deviceStore }) => {
  return (
    <React.Fragment>
      <tr className={deviceStore?.fw?.update?.error && 'row-with-error'}>
        <td className="device-title-cell">
          <DeviceName
            title={deviceStore.title}
            bootloaderMode={deviceStore.bootloader_mode}
            errors={deviceStore?.errors}
            duplicateMqttTopic={deviceStore.duplicateMqttTopic}
            unknownType={deviceStore.isUnknownType}
            selected={deviceStore.selected}
            onSelectionChange={e => deviceStore.setSelected(e.target.checked)}
            matchingDeviceTypes={deviceStore.names.slice(1)}
          />
        </td>
        <td>{deviceStore.sn}</td>
        <td>
          <SlaveId slaveId={deviceStore.address} isDuplicate={deviceStore.duplicateSlaveId} />
        </td>
        <td>
          <Port
            path={deviceStore.port}
            baudRate={deviceStore.baudRate}
            dataBits={deviceStore.dataBits}
            parity={deviceStore.parity}
            stopBits={deviceStore.stopBits}
            misconfiguredPort={deviceStore.misconfiguredPort}
          />
        </td>
      </tr>
      <ErrorRow error={deviceStore?.fw?.update?.error} />
    </React.Fragment>
  );
});

function DevicesTable({ devices }) {
  const { t } = useTranslation();
  return (
    <div className="scrollable-table-wrapper">
      <table className="table table-condensed">
        <thead>
          <tr>
            <th style={{ width: '44%' }}>{t('scan.labels.device')}</th>
            <th style={{ width: '14%' }}>{t('scan.labels.sn')}</th>
            <th style={{ width: '15%' }}>{t('scan.labels.address')}</th>
            <th style={{ width: '27%' }}>{t('scan.labels.port')}</th>
          </tr>
        </thead>
        <tbody>
          {devices.map(d => (
            <DeviceRow key={d.uuid} deviceStore={d} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DevicesTable;
