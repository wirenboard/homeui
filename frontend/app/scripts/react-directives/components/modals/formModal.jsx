import { observer } from 'mobx-react-lite';
import { Button } from '../../common';
import { MakeFormFields } from '../../forms/forms';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalCancelButton
} from './modals';

const FormModal = observer(({ id, active, title, formStore, onOk, onCancel, okButtonLabel }) => {
  const onSubmit = (e) => {
    e.preventDefault();
    onOk();
  };
  return (
    <Modal id={id} active={active} onCancel={onCancel}>
      <ModalHeader>
        <ModalTitle id={id} text={title} />
      </ModalHeader>
      <form onSubmit={onSubmit}>
        <ModalBody>
          {MakeFormFields(Object.entries(formStore?.params || {}))}
        </ModalBody>
        <ModalFooter>
          <Button
            label={okButtonLabel}
            type="primary"
            disabled={formStore?.hasErrors}
            submit={true}
          />
          <ModalCancelButton onClick={onCancel} />
        </ModalFooter>
      </form>
    </Modal>
  );
});

export default FormModal;
