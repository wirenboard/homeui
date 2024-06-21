import React from 'react';
import { useTranslation } from 'react-i18next';
import SimpleModal from '../../components/modals/simpleModal';
import { observer } from 'mobx-react-lite';
import { useMediaQuery } from 'react-responsive';
import { Row, RowWithTitle } from './mobile';

const DeviceRow = ({ device }) => {
  return (
    <tr>
      <td>{device.title}</td>
      <td>{device.sn}</td>
      <td>{device.port}</td>
      <td>
        {device.address} &rArr; <b>{device.newAddress}</b>
      </td>
    </tr>
  );
};

const DevicesTable = observer(({ devices }) => {
  const { t } = useTranslation();
  return (
    <div className="scrollable-table-wrapper">
      <table className="table table-condensed">
        <thead>
          <tr>
            <th>{t('scan.labels.device')}</th>
            <th>{t('scan.labels.sn')}</th>
            <th>{t('scan.labels.port')}</th>
            <th>{t('scan.labels.address')}</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((d, index) => (
            <DeviceRow key={index} device={d} />
          ))}
        </tbody>
      </table>
    </div>
  );
});

const DevicePanel = ({ device }) => {
  const { t } = useTranslation();
  return (
    <div className="panel panel-default">
      <div className="panel-body">
        <Row>
          <b>{device.title}</b>
        </Row>
        <RowWithTitle title="SN">{device.sn}</RowWithTitle>
        <RowWithTitle title={t('scan.labels.port')}>{device.port}</RowWithTitle>
        <RowWithTitle title={t('scan.labels.address')}>
          {device.address} &rArr; <b>{device.newAddress}</b>
        </RowWithTitle>
      </div>
    </div>
  );
};

const DevicesList = observer(({ devices }) => {
  return (
    <div className="scrollable-panels-wrapper">
      {devices.map((d, index) => (
        <DevicePanel key={index} device={d} />
      ))}
    </div>
  );
});

const SetupAddressModal = observer(({ state }) => {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery({ minWidth: 874 });
  return (
    <SimpleModal {...state.simpleModalState}>
      <p style={{ textAlign: 'center' }}>{t('device-manager.labels.address-conflicts-note')}</p>
      {isDesktop ? (
        <DevicesTable devices={state.devices} />
      ) : (
        <DevicesList devices={state.devices} />
      )}
    </SimpleModal>
  );
});

export default SetupAddressModal;
