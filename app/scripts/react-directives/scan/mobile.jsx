import React from 'react';
import { useTranslation } from 'react-i18next';
import { WarningBox, ErrorBox } from './common'

function DeviceName(props) {
    return ( 
      <div>
          <b>{props.title}</b> ({props.sn})
      </div>
    )
}

function Tags(props) {
  return (
    <div>
        {props.bootloader_mode && <ErrorBox text="in bootloder"/>}
        {!props.online && <ErrorBox text="offline"/>}
        {!props.poll && <WarningBox text="not polled"/>}
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

function SlaveId({slaveId}) {
  return <Row title='SlaveID'>{slaveId}</Row>;
}

function Port({path, baud_rate, data_bits, parity, stop_bits}) {
    return  (
      <Row title='Port'>
        {path} {baud_rate} {data_bits.toString()}{parity}{stop_bits.toString()}
      </Row>
    )
}

function Firmware(props) {
  const { t } = useTranslation();
    if (props.update && props.update.available_fw) {
      const text = t('device-manager.table.available') + ' ' + props.update.available_fw
      return (
        <Row title='Firmware'>
          {props.version} <WarningBox text={text}/>
        </Row>
      )
    }
    return <Row title='Firmware'>{props.version}</Row>
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
          <DeviceName {...props} />
          <Tags {...props} />
          <SlaveId slaveId={props.cfg.slave_id}></SlaveId>
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
