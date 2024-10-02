import React from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceName, SlaveId, Port } from './common';
import { observer } from 'mobx-react-lite';
import CollapseButton from '../../components/buttons/collapseButton';

export const Row = ({ children }) => {
  return (
    <div className="row">
      <div className="col-xs-12">{children}</div>
    </div>
  );
};

export const RowWithTitle = ({ title, children }) => {
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

const AlreadyConfiguredDevicesHeader = observer(
  ({ alreadyConfiguredDevices, collapseButtonState }) => {
    const { t } = useTranslation();
    if (!alreadyConfiguredDevices.length) {
      return null;
    }
    return (
      <div className="devices-in-config-mobile-header">
        <CollapseButton state={collapseButtonState} /> &nbsp;
        {t('scan.labels.device-in-config')}
      </div>
    );
  }
);

const DevicePanel = ({ deviceStore }) => {
  const { t } = useTranslation();
  const panelClasses = deviceStore.selectable
    ? 'panel panel-default'
    : 'panel panel-default not-selectable';
  return (
    <div className={panelClasses}>
      <div className="panel-body">
        <Row>
          <DeviceName
            title={deviceStore.title}
            bootloaderMode={deviceStore.bootloader_mode}
            errors={deviceStore?.errors}
            duplicateMqttTopic={deviceStore.duplicateMqttTopic}
            unknownType={deviceStore.isUnknownType}
            selected={deviceStore.selected}
            onSelectionChange={e => deviceStore.setSelected(e.target.checked)}
            otherMatchingDeviceTypesNames={deviceStore.names.slice(1)}
            selectable={deviceStore.selectable}
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

const DevicesList = observer(({ newDevices, alreadyConfiguredDevices, collapseButtonState }) => {
  return (
    <>
      {newDevices.map(d => (
        <DevicePanel key={d.uuid} deviceStore={d} />
      ))}
      <AlreadyConfiguredDevicesHeader
        alreadyConfiguredDevices={alreadyConfiguredDevices}
        collapseButtonState={collapseButtonState}
      />
      {!collapseButtonState.collapsed &&
        alreadyConfiguredDevices.map((d, index) => <DevicePanel key={index} deviceStore={d} />)}
    </>
  );
});

export default DevicesList;
