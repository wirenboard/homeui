import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EditIcon from '@/assets/icons/edit.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Confirm, useConfirm } from '@/components/confirm';
import { Dropdown, type Option } from '@/components/dropdown';
import { Table, TableCell, TableRow } from '@/components/table';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { EditUserModal } from '@/pages/settings/users/components/edit-user';
import { authStore, UserRole } from '@/stores/auth';
import { store } from './page-store';
import './styles.css';

const UsersPage = observer(() => {
  const { t } = useTranslation();
  const [deletedUserId, setDeletedUserId] = useState('');
  const [ confirm, isOpened, handleConfirm, handleClose ] = useConfirm<any>();
  const [ userSave, userEditOpened, saveUser, closeUserEdit ] = useConfirm<any>();
  const [ editedUser, setEditedUser ] = useState<any>();

  useEffect(() => {
    if (authStore.hasRights(UserRole.Admin)) {
      store.loadUsers();
    }

    store.showEnableHttpsConfirmModal = confirm;
    store.showUserEditModal = userSave;
  }, []);

  return (
    <PageLayout
      title={t('users.title')}
      hasRights={authStore.hasRights(UserRole.Admin)}
      isLoading={store.isLoading}
      errors={store.errors}
      actions={
        <Button
          label={t('users.buttons.add')}
          variant="primary"
          disabled={store.isLoading}
          onClick={async () => {
            if (!authStore.areUsersConfigured) {
              setEditedUser({ readOnly: true });
            }
            await store.addUser();
          }}
        />
      }
    >
      <Table>
        <TableRow isHeading>
          <TableCell width="50%">
            {t('users.labels.login')}
          </TableCell>
          <TableCell width="50%">
            {t('users.labels.type')}
          </TableCell>
          <TableCell width={100} />
        </TableRow>

        {store.users.map((user) => (
          <TableRow key={user.id}>
            <TableCell ellipsis>
              {user.login}
            </TableCell>

            <TableCell>
              {t('users.labels.' + user.type)}
            </TableCell>

            <TableCell align="right">
              <div className="users-actions">
                <Tooltip text={t('users.buttons.edit')}>
                  <Button
                    size="small"
                    variant="primary"
                    aria-label={t('users.buttons.edit')}
                    icon={<EditIcon />}
                    onClick={() => {
                      setEditedUser({ ...user, readOnly: user.type === 'admin' && store.onlyOneAdmin });
                      store.editUser(user);
                    }}
                  />
                </Tooltip>

                <Tooltip text={t('users.buttons.delete')}>
                  <Button
                    size="small"
                    variant="danger"
                    icon={<TrashIcon />}
                    aria-label={t('users.buttons.delete')}
                    disabled={user.type === 'admin' && store.onlyOneAdmin}
                    onClick={() => setDeletedUserId(user.id)}
                  />
                </Tooltip>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </Table>

      <label className="users-autologin">
        {t('users.labels.autologin')}
        <Dropdown
          options={store.autologinOptions}
          value={store.autologinUser}
          onChange={({ value }: Option<string>) => store.setAutologinUser(value)}
        />
      </label>

      {userEditOpened && (
        <EditUserModal
          user={editedUser}
          onSave={(data) => {
            saveUser(data);
            setEditedUser(null);
          }}
          onCancel={() => {
            closeUserEdit();
            setEditedUser(null);
          }}
        />
      )}

      <Confirm
        width={650}
        isOpened={isOpened}
        heading={t('users.labels.https')}
        acceptLabel={t('users.buttons.enable-https')}
        cancelLabel={t('users.buttons.use-http')}
        closeCallback={handleClose}
        confirmCallback={handleConfirm}
      >
        {t('users.labels.enable-https-warning', {
          domain: store.httpsDomainName,
          interpolation: { escapeValue: false },
        })}
      </Confirm>

      {deletedUserId && (
        <Confirm
          isOpened={!!deletedUserId}
          heading={t('users.labels.confirm-delete-heading')}
          variant="danger"
          acceptLabel={t('users.buttons.delete')}
          closeCallback={() => setDeletedUserId(null)}
          confirmCallback={async () => {
            await store.deleteUser(deletedUserId);
            setDeletedUserId(null);
          }}
        >
          {
            t(
              'users.labels.confirm-delete',
              { name: authStore.users.find((user) => user.id === deletedUserId).login })
          }
        </Confirm>
      )}
    </PageLayout>
  );
});

export default UsersPage;
