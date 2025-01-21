import React from 'react';
import { observer } from 'mobx-react-lite';
import { PageWrapper, PageTitle, PageBody } from '../components/page-wrapper/pageWrapper';
import { useTranslation } from 'react-i18next';
import FormModal from '../components/modals/formModal';
import { Button } from '../common';
import ConfirmModal from '../components/modals/confirmModal';

const UsersPage = observer(({ store }) => {
  const { t } = useTranslation();
  return (
    <PageWrapper
      error={store.pageWrapperStore.error}
      className={'users-page'}
      accessLevelStore={store.accessLevelStore}
    >
      <FormModal {...store.formModalState} />
      <ConfirmModal {...store.confirmModalState} />
      <PageTitle title={t('users.title')}>
        <div className="pull-right">
          <Button
            label={t('users.buttons.add')}
            type="primary"
            onClick={() => store.addUser()}
            icon="glyphicon glyphicon-plus"
            disabled={store.pageWrapperStore.loading}
          />
        </div>
      </PageTitle>
      <PageBody loading={store.pageWrapperStore.loading}>
        <table className="table">
          <thead>
            <tr>
              <th>{t('users.labels.login')}</th>
              <th>{t('users.labels.type')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {store.users.map(user => (
              <tr key={user.id}>
                <td style={{ verticalAlign: 'middle' }}>{user.login}</td>
                <td style={{ verticalAlign: 'middle' }}>{t('users.labels.' + user.type)}</td>
                <td>
                  <div className="pull-right" style={{ minWidth: '82px' }}>
                    <Button
                      type="primary"
                      icon="glyphicon glyphicon-edit"
                      onClick={() => store.editUser(user)}
                    />
                    &nbsp;
                    <Button
                      type="danger"
                      icon="glyphicon glyphicon-trash"
                      onClick={() => store.deleteUser(user)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PageBody>
    </PageWrapper>
  );
});

function CreateUsersPage({ store }) {
  return <UsersPage store={store} />;
}

export default CreateUsersPage;
