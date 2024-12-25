import React from 'react';
import { observer } from 'mobx-react-lite';
import { PageWrapper, PageTitle, PageBody } from '../components/page-wrapper/pageWrapper';
import { useTranslation } from 'react-i18next';
import FormModal from '../components/modals/formModal';
import { Button } from '../common';

const UsersPage = observer(({ store }) => {
  const { t } = useTranslation();
  return (
    <PageWrapper
      error={store.pageWrapperStore.error}
      className={'users-page'}
      accessLevelStore={store.accessLevelStore}
    >
      <FormModal {...store.formModalState} />
      <PageTitle title={t('users.title')} />
      <PageBody loading={store.pageWrapperStore.loading}>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}
        >
          {store.accessLevelStore.allowToEditUser && (
            <Button
              onClick={() => store.editUser()}
              type="success"
              label={t('users.labels.edit-user')}
            />
          )}
          {store.accessLevelStore.allowToEditOperator && (
            <Button
              onClick={() => store.editOperator()}
              type="success"
              label={t('users.labels.edit-operator')}
            />
          )}
          {store.accessLevelStore.allowToEditAdmin && (
            <Button
              onClick={() => store.editAdmin()}
              type="success"
              label={t('users.labels.edit-admin')}
            />
          )}
        </div>
      </PageBody>
    </PageWrapper>
  );
});

function CreateUsersPage({ store }) {
  return <UsersPage store={store} />;
}

export default CreateUsersPage;
