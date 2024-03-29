import React from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceName, SlaveId, Port } from './common';
import { Checkbox } from '../../common';

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

const DevicePanel = ({ deviceStore }) => {
  const { t } = useTranslation();
  return (
    <div className="panel panel-default">
      <div className="panel-body">
        <Row>
          <DeviceName
            title={deviceStore.title}
            bootloaderMode={deviceStore.bootloader_mode}
            errors={deviceStore?.errors}
            duplicateMqttTopic={deviceStore.duplicateMqttTopic}
            unknownType={!deviceStore.deviceType}
            selected={deviceStore.selected}
            onSelectionChange={e => deviceStore.setSelected(e.target.checked)}
            disabled={!deviceStore.deviceType}
          />
        </Row>
        <RowWithTitle title="SN">{deviceStore.sn}</RowWithTitle>
        <RowWithTitle title={t('scan.labels.address')}>
          <SlaveId slaveId={deviceStore.address} isDuplicate={deviceStore.duplicateSlaveId} />
        </RowWithTitle>
        <RowWithTitle title={t('scan.labels.port')}>
          <Port
            path={deviceStore.port}
            baudRate={deviceStore.baudRate}
            dataBits={deviceStore.dataBits}
            parity={deviceStore.parity}
            stopBits={deviceStore.stopBits}
            misconfiguredPort={deviceStore.misconfiguredPort}
          />
        </RowWithTitle>
        <Error error={deviceStore?.fw?.update?.error} />
      </div>
    </div>
  );
};

const DevicesList = ({ devices }) => {
  return (
    <>
      {devices.map(d => (
        <DevicePanel key={d.uuid} deviceStore={d} />
      ))}
    </>
  );
};

export default DevicesList;
