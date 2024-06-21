import React from 'react';
import { Button } from '../../common';
import {
  Modal,
  ModalBody,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  ModalCancelButton,
} from './modals';

const SimpleModal = ({ id, active, text, okText, onOk, onCancel, children }) => {
  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalHeader>
        <ModalTitle id={id} text={text} />
      </ModalHeader>
      <ModalBody>{children}</ModalBody>
      <ModalFooter>
        <Button label={okText} type={'success'} onClick={onOk} />
        <ModalCancelButton onClick={onCancel} />
      </ModalFooter>
    </Modal>
  );
};

export default SimpleModal;
