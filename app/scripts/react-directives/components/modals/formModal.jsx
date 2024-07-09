import React from 'react';
import { Button } from '../../common';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalCancelButton,
} from './modals';
import { MakeFormFields } from '../../forms/forms';
import { observer } from 'mobx-react-lite';

const FormModal = observer(({ id, active, title, formStore, onOk, onCancel, okButtonLabel }) => {
  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalHeader>
        <ModalTitle id={id} text={title} />
      </ModalHeader>
      <ModalBody>{MakeFormFields(Object.entries(formStore?.params || {}))}</ModalBody>
      <ModalFooter>
        <Button
          label={okButtonLabel}
          type={'success'}
          onClick={onOk}
          disabled={formStore?.hasErrors}
        />
        <ModalCancelButton onClick={onCancel} />
      </ModalFooter>
    </Modal>
  );
});

export default FormModal;
