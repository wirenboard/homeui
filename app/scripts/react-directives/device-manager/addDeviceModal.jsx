import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalCancelButton,
} from '../components/modals/modals';
import BootstrapLikeSelect from '../components/select/select';

const AddDeviceModal = ({ active, ports, devices, currentPort, onSelect, onCancel }) => {
  const { t } = useTranslation();
  const [selectedDevice, setSelectedDevice] = useState(undefined);
  useEffect(() => {
    if (devices?.length) {
      if (devices[0]?.options) {
        setSelectedDevice(devices[0].options[0]);
      } else {
        setSelectedDevice(devices[0]);
      }
    }
  }, [devices]);

  const [selectedPort, setSelectedPort] = useState(currentPort);
  useEffect(() => {
    setSelectedPort(currentPort);
  }, [currentPort]);
  return (
    <Modal id={'add-device-modal'} active={active} onCancel={onCancel}>
      <ModalHeader>
        <ModalTitle
          id={'add-device-modal'}
          text={t('device-manager.labels.add-device')}
        ></ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className={'form-group'}>
          <label className="control-label">{t('device-manager.labels.port')}</label>
          <BootstrapLikeSelect
            options={ports}
            selectedOption={selectedPort}
            onChange={option => setSelectedPort(option)}
          />
        </div>
        <div className={'form-group'}>
          <label className="control-label">{t('device-manager.labels.device-type')}</label>
          <BootstrapLikeSelect
            options={devices}
            selectedOption={selectedDevice}
            onChange={option => setSelectedDevice(option)}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          label={t('device-manager.buttons.add-device')}
          type={'success'}
          onClick={() => onSelect(selectedPort.value, selectedDevice.value)}
        />
        <ModalCancelButton onClick={onCancel} />
      </ModalFooter>
    </Modal>
  );
};

export default AddDeviceModal;
