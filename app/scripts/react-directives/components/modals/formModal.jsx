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
  const formId = id + 'Form';
  const onSubmit = e => {
    e.preventDefault();
    onOk();
  };
  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalHeader>
        <ModalTitle id={id} text={title} />
      </ModalHeader>
      <ModalBody>
        <form id={formId} onSubmit={onSubmit}>
          {MakeFormFields(Object.entries(formStore?.params || {}))}
        </form>
      </ModalBody>
      <ModalFooter>
        <Button
          label={okButtonLabel}
          type={'success'}
          disabled={formStore?.hasErrors}
          form={formId}
        />
        <ModalCancelButton onClick={onCancel} />
      </ModalFooter>
    </Modal>
  );
});

export default FormModal;
