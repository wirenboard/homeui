import React from 'react';
import { useTranslation } from 'react-i18next';
import { FirmwareVersion, DeviceName, Port, SlaveId } from './common';

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

function DeviceRow(props) {
  return (
    <React.Fragment>
      <tr className={props?.fw?.update?.error && 'row-with-error'}>
        <td>
          <DeviceName
            title={props.title}
            bootloaderMode={props.bootloader_mode}
            online={props.online}
            poll={props.poll}
            errors={props.errors}
          />
        </td>
        <td>{props.sn}</td>
        <td>
          <SlaveId slaveId={props.cfg.slave_id} isDuplicate={props.slave_id_collision} />
        </td>
        <td>
          <Port
            path={props.port.path}
            baudRate={props.cfg.baud_rate}
            dataBits={props.cfg.data_bits}
            parity={props.cfg.parity}
            stopBits={props.cfg.stop_bits}
          />
        </td>
        <td>
          <FirmwareVersion
            version={props.fw?.version}
            availableFw={props.fw?.update?.available_fw}
            extSupport={props.fw?.ext_support}
            errors={props.errors}
          />
        </td>
      </tr>
      <ErrorRow error={props?.fw?.update?.error} />
    </React.Fragment>
  );
}

function DevicesTable({ devices }) {
  const { t } = useTranslation();
  return (
    <table className="table table-condensed">
      <thead>
        <tr>
          <th style={{ width: '40%' }}>{t('scan.labels.device')}</th>
          <th style={{ width: '10%' }}>{t('scan.labels.sn')}</th>
          <th style={{ width: '11%' }}>{t('scan.labels.address')}</th>
          <th style={{ width: '22%' }}>{t('scan.labels.port')}</th>
          <th style={{ width: '17%' }}>{t('scan.labels.firmware')}</th>
        </tr>
      </thead>
      <tbody>
        {devices.map(d => (
          <DeviceRow key={d.uuid} {...d} />
        ))}
      </tbody>
    </table>
  );
}

export default DevicesTable;
