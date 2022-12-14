import React from 'react';
import { useTranslation } from 'react-i18next';
import { WarningTag, ErrorTag } from './common'

function DeviceNameCell(props) {
  const { t } = useTranslation();
    return ( 
        <td>
            <div className='pull-left'>
                <b>{props.title} / {props.fw_signature}</b> ({props.sn})
            </div>
            <div className='pull-right'>
                {props.bootloader_mode && <ErrorTag text={t("device-manager.labels.in-bootloder")}/>}
                {!props.online && <ErrorTag text={t("device-manager.labels.offline")}/>}
                {!props.poll && <WarningTag text={t("device-manager.labels.not-polled")}/>}
            </div>
        </td>
    );
}

function PortSettingsCell({baud_rate, data_bits, parity, stop_bits}) {
    return <td>{baud_rate} {data_bits.toString()}{parity}{stop_bits.toString()}</td>;
}

function FirmwareCell(props) {
  const { t } = useTranslation();
    if (props.update && props.update.available_fw) {
        const text = t('device-manager.labels.available') + ' ' + props.update.available_fw
        return <td>{props.version} <WarningTag text={text}/></td>;
    }
    return <td>{props.version}</td>;
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
    var error
    if (props.fw && props.fw.update) 
      error = props.fw.update.error
    if (props.error)
      error = props.error 
    return (
      <React.Fragment key={props.uuid}>
        <tr className={error && 'row-with-error'}>
            <DeviceNameCell {...props} />
            <td>{props.cfg.slave_id}</td>
            <td>{props.port.path}</td>
            <PortSettingsCell {...props.cfg} />
            <FirmwareCell {...props.fw} />
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
                    <th>{t('device-manager.labels.device')}</th>
                    <th>{t('device-manager.labels.address')}</th>
                    <th>{t('device-manager.labels.port')}</th>
                    <th>{t('device-manager.labels.settings')}</th>
                    <th>{t('device-manager.labels.firmware')}</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>
    );
}

export default DevicesTable;
