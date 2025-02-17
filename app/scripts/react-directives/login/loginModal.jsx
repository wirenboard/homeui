import { observer } from 'mobx-react-lite';
import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBar, Button } from '../common';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle
} from '../components/modals/modals';
import { MakeFormFields } from '../forms/forms';

const LoginModal = observer(({ store }) => {
  const { t } = useTranslation();
  const ref = useRef(null);
  useEffect(() => {
    if (store.error) {
      ref.current?.focus();
    }
  });

  const onSubmit = (e) => {
    e.preventDefault();
    store.postLogin();
  };

  return (
    <Modal id="loginModal" active={store.active}>
      <ModalHeader>
        <ModalTitle id="loginModal" text={t(store.formStore.name)} />
      </ModalHeader>
      <ModalBody>
        {store.httpWarning && <ErrorBar msg={t('login.errors.http-warning')} />}
        <form id="loginModalForm" onSubmit={onSubmit}>
          {MakeFormFields(Object.entries(store.formStore.params || {}), ref)}
        </form>
        {store.error && <ErrorBar msg={t('login.errors.failed')} />}
      </ModalBody>
      <ModalFooter>
        <Button
          label={t('login.buttons.login')}
          type="success"
          form="loginModalForm"
          disabled={store.loading}
        />
      </ModalFooter>
    </Modal>
  );
});

function CreateLoginModal({ store }) {
  return <LoginModal store={store} />;
}

export default CreateLoginModal;
