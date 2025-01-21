import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '../components/modals/modals';
import { MakeFormFields } from '../forms/forms';
import { ErrorBar, Button } from '../common';

const LoginModal = observer(({ store }) => {
  const { t } = useTranslation();

  return (
    <Modal id={'loginModal'} active={store.active}>
      <ModalHeader>
        <ModalTitle id={'loginModal'} text={t(store.formStore.name)} />
      </ModalHeader>
      <ModalBody>
        {store.httpWarning && <ErrorBar msg={t('login.errors.http-warning')}></ErrorBar>}
        {MakeFormFields(Object.entries(store.formStore.params || {}))}
        {store.error && <ErrorBar msg={t('login.errors.failed')}></ErrorBar>}
      </ModalBody>
      <ModalFooter>
        <Button
          label={t('login.buttons.login')}
          type={'success'}
          onClick={() => store.postLogin()}
        />
      </ModalFooter>
    </Modal>
  );
});

function CreateLoginModal({ store }) {
  return <LoginModal store={store} />;
}

export default CreateLoginModal;
