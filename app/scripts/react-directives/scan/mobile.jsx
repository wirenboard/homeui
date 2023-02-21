import React from 'react';
import { useTranslation } from 'react-i18next';
import { FirmwareVersion, DeviceName, SlaveId, Port } from './common';

const Row = ({ children }) => {
  return (
    <div className="row">
      <div className="col-xs-12">{children}</div>
    </div>
  );
};

const RowWithTitle = ({ title, children }) => {
  return (
    <div className="row">
      <div className="col-xs-3">{title}</div>
      <div className="col-xs-9">{children}</div>
    </div>
  );
};

const Error = ({ error }) => {
  if (!error) {
    return;
  }
  return (
    <Row>
      <div className="tag bg-danger error">{error}</div>
    </Row>
  );
};

const DevicePanel = props => {
  const { t } = useTranslation();
  return (
    <div className="panel panel-default">
      <div className="panel-body">
        <Row>
          <DeviceName
            title={props.title}
            bootloaderMode={props.bootloader_mode}
            online={props.online}
            poll={props.poll}
            errors={props.errors}
          />
        </Row>
        <RowWithTitle title="SN">{props.sn}</RowWithTitle>
        <RowWithTitle title={t('device-manager.labels.address')}>
          <SlaveId slaveId={props.cfg.slave_id} isDuplicate={props.slave_id_collision} />
        </RowWithTitle>
        <RowWithTitle title={t('device-manager.labels.port')}>
          <Port
            path={props.port.path}
            baudRate={props.cfg.baud_rate}
            dataBits={props.cfg.data_bits}
            parity={props.cfg.parity}
            stopBits={props.cfg.stop_bits}
          />
        </RowWithTitle>
        <RowWithTitle title={t('device-manager.labels.firmware')}>
          <FirmwareVersion
            version={props.fw?.version}
            availableFw={props.fw?.update?.available_fw}
            extSupport={props.fw?.ext_support}
            errors={props.errors}
          />
        </RowWithTitle>
        <Error error={props?.fw?.update?.error} />
      </div>
    </div>
  );
};

const DevicesList = ({ devices }) => {
  return (
    <>
      {devices.map(d => (
        <DevicePanel key={d.uuid} {...d} />
      ))}
    </>
  );
};

export default DevicesList;
