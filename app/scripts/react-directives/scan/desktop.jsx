import React from 'react';
import { useTranslation } from 'react-i18next';
import { WarningTag, ErrorTag, FirmwareVersionWithLabels } from './common';

function DeviceNameCell(props) {
  const { t } = useTranslation();
  const errorId = "com.wb.device_manager.device.read_device_signature_error";
  const error = props.errors.find(e => e.id === errorId);
  if (error) {
    return <td><ErrorTag text={t("com.wb.device_manager.error")} title={t(errorId) || error.message}/></td>;
  }
  return (
    <td>
      <div className='pull-left'>
        <b>{props.title}</b>
      </div>
      <div className='pull-right'>
        {props.bootloader_mode && <ErrorTag text={t("device-manager.labels.in-bootloder")}/>}
        {!props.online && <ErrorTag text={t("device-manager.labels.offline")}/>}
        {!props.poll && <WarningTag text={t("device-manager.labels.not-polled")}/>}
      </div>
    </td>
  );
}

function SerialNumberCell({sn}) {
  return <td>{sn}</td>;
}

function PortCell({path, baud_rate, data_bits, parity, stop_bits}) {
  return (
    <td>
      {path} <span className='baudrate'>{baud_rate}</span> {data_bits.toString()}{parity}{stop_bits.toString()}
    </td>
  );
}

function FirmwareCell(props) {
  const { t } = useTranslation();
  const errorId = "com.wb.device_manager.device.read_fw_version_error";
  const error = props.errors.find(e => e.id === errorId);
  if (error) {
    return <td><ErrorTag text={t("com.wb.device_manager.error")} title={t(errorId) || error.message}/></td>;
  }
  return (
    <td>
      <FirmwareVersionWithLabels version={props.fw?.version} availableFw={props.fw?.update?.available_fw} extSupport={props.fw?.ext_support}/>
    </td>
  );
}

function SlaveIdCell({slaveId, isDuplicate}) {
  const { t } = useTranslation();
  return (
    <td>
      <span className='slave-id'>{slaveId}</span> {isDuplicate && <ErrorTag text={t('device-manager.labels.duplicate')}/>}
    </td>
  );
}

function ErrorRow({error}) {
  return (
    <tr>
      <td colSpan='5'>
        <div className='tag bg-danger'>{error}</div>
      </td>
    </tr>
  );
}

function DeviceRow(props) {
    var error;
    if (props.fw && props.fw.update)
      error = props.fw.update.error;
    return (
      <React.Fragment key={props.uuid}>
        <tr className={error && 'row-with-error'}>
            <DeviceNameCell {...props} />
            <SerialNumberCell sn={props.sn} />
            <SlaveIdCell slaveId={props.cfg.slave_id} isDuplicate={props.slave_id_collision} />
            <PortCell path={props.port.path} baud_rate={props.cfg.baud_rate} data_bits={props.cfg.data_bits} parity={props.cfg.parity} stop_bits={props.cfg.stop_bits} />
            <FirmwareCell {...props} />
        </tr>
        {error && <ErrorRow error={error}/>}
      </React.Fragment>
    );
}

function DevicesTable({devices}) {
    const { t } = useTranslation();
    const rows = devices.map((d) => DeviceRow(d));
    return (
        <table className='table table-condensed'>
            <thead>
                <tr>
                    <th style={{width: "40%"}}>{t('device-manager.labels.device')}</th>
                    <th style={{width: "10%"}}>{t('device-manager.labels.sn')}</th>
                    <th style={{width: "11%"}}>{t('device-manager.labels.address')}</th>
                    <th style={{width: "22%"}}>{t('device-manager.labels.port')}</th>
                    <th style={{width: "17%"}}>{t('device-manager.labels.firmware')}</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>
    );
}

export default DevicesTable;
