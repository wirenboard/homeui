import React from 'react';
import { Button } from '../../common';
import { Modal, ModalBody, ModalTitle, ModalFooter, ModalCancelButton } from './modals';

const ConfirmModal = ({ id, active, text, buttons, onCancel }) => {
  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalBody>
        <ModalTitle id={id} text={text} />
      </ModalBody>
      <ModalFooter>
        {buttons?.length &&
          buttons.map((bt, index) => {
            return (
              <Button
                key={index}
                label={bt.label}
                type={bt.type || 'default'}
                onClick={bt.onClick}
              />
            );
          })}
        <ModalCancelButton onClick={onCancel} />
      </ModalFooter>
    </Modal>
  );
};

export default ConfirmModal;
