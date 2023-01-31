import React from 'react';
import { useTranslation } from 'react-i18next';
import { WarningTag, ErrorTag, FirmwareVersionWithLabels } from './common';

function Tags({bootloader_mode, online, poll}) {
  const { t } = useTranslation();
  return (
    <div className='pull-right'>
        {bootloader_mode && <ErrorTag text={t("device-manager.labels.in-bootloder")}/>}
        {!online && <ErrorTag text={t("device-manager.labels.offline")}/>}
        {!poll && <WarningTag text={t("device-manager.labels.not-polled")}/>}
    </div>
  )
}

function DeviceName({title, bootloader_mode, online, poll}) {
  return ( 
    <div className='row'>
      <div className='col-xs-12'>
        <div className='pull-left'>
            <b>{title}</b>
        </div>
        <Tags bootloader_mode={bootloader_mode} online={online} poll={poll} />
      </div>
    </div>
  )
}

function Row({title, children}) {
  return (
    <div className='row'>
      <div className='col-xs-3'>{title}</div>
      <div className='col-xs-9'>{children}</div>
    </div>
  )
}

function SlaveId({slaveId, isDuplicate}) {
  const { t } = useTranslation();
  return (
    <Row title={t('device-manager.labels.address')}>
      {slaveId} {isDuplicate && <ErrorTag text={t('device-manager.labels.duplicate')}/>}
    </Row>);
}

function SerialNumber({sn}) {
  return <Row title='SN'>{sn}</Row>;
}

function Port({path, baud_rate, data_bits, parity, stop_bits}) {
    const { t } = useTranslation();
    return  (
      <Row title={t('device-manager.labels.port')}>
        {path} {baud_rate} {data_bits.toString()}{parity}{stop_bits.toString()}
      </Row>
    )
}

function Firmware(props) {
  const { t } = useTranslation();
  return (
    <Row title={t('device-manager.labels.firmware')}>
      <FirmwareVersionWithLabels version={props.version} available_fw={props.update?.available_fw} ext_support={props.ext_support}/>
    </Row>
  )
}

function Error({error}) {
  return (
    <div className='row'>
      <div className='col-xs-12'>
        <div className='tag bg-danger error'>
          {error}
        </div>
      </div>
    </div>
  );
}

function DevicePanel(props) {
    var error
    if (props.fw && props.fw.update) 
      error = props.fw.update.error
    if (props.error)
      error = props.error 
    return (
      <div key={props.uuid} className='panel panel-default'>
        <div className='panel-body'>
          <DeviceName title={props.title} bootloader_mode={props.bootloader_mode} online={props.online} poll={props.poll} />
          <SerialNumber sn={props.sn} />
          <SlaveId slaveId={props.cfg.slave_id} isDuplicate={props.slave_id_collision}></SlaveId>
          <Port path={props.port.path} baud_rate={props.cfg.baud_rate} data_bits={props.cfg.data_bits} parity={props.cfg.parity} stop_bits={props.cfg.stop_bits} />
          <Firmware {...props.fw} />
          {error && <Error error={error}/>}
        </div>
      </div>
    );
}

function DevicesList({devices}) {
    const rows = devices.map((d) => DevicePanel(d));
    return (
      <>
        {rows}
      </>
    );
}

export default DevicesList;
