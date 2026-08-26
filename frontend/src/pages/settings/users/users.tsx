import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EditIcon from '@/assets/icons/edit.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { documentation } from '@/common/links';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Confirm, useConfirm } from '@/components/confirm';
import { Dropdown, type Option } from '@/components/dropdown';
import { Table, TableCell, TableRow } from '@/components/table';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { EditUserModal } from '@/pages/settings/users/components/edit-user';
import { authStore, UserRole } from '@/stores/auth';
import { useAsyncAction } from '@/utils/async-action';
import { store } from './page-store';
import './styles.css';

const UsersPage = observer(() => {
  const { t, i18n } = useTranslation();
  const [deletedUserId, setDeletedUserId] = useState('');
  const [ confirm, isOpened, handleConfirm, handleClose ] = useConfirm<any>();
  const [ editedUser, setEditedUser ] = useState<any>();

  const [loadUsers, isLoading] = useAsyncAction(async () => {
    if (authStore.hasRights(UserRole.Admin)) {
      await store.loadUsers();
    }
  });

  useEffect(() => {
    loadUsers();
    store.showEnableHttpsConfirmModal = confirm;
  }, []);

  const [save, isSaving] = useAsyncAction(async (data) => {
    if (editedUser.id) {
      await store.editUser(editedUser, data);
    } else {
      await store.addUser(data);
    }

    setEditedUser(null);
  });

  const [deleteUser, isDeleting] = useAsyncAction(async (id: string) => {
    await store.deleteUser(id);
    setDeletedUserId(null);
  });

  return (
    <PageLayout
      title={t('users.title')}
      infoLink={documentation[i18n.language]?.users}
      hasRights={authStore.hasRights(UserRole.Admin)}
      isLoading={isLoading}
      errors={store.errors}
      actions={
        <Button
          label={t('users.buttons.add')}
          variant="primary"
          aria-haspopup="dialog"
          onClick={async () => {
            if (!authStore.areUsersConfigured) {
              if (!await store.confirmSetupHttps()) {
                return;
              }
            }
            setEditedUser({});
          }}
        />
      }
    >
      {store.users.length ? (
        <>
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
                  <span id={`username-${user.login}`}>{user.login}</span>
                </TableCell>

                <TableCell>
                  {t('users.labels.' + user.type)}
                </TableCell>

                <TableCell align="right">
                  <div className="users-actions">
                    <Tooltip
                      id={`edit-${user.login}`}
                      text={t('users.buttons.edit')}
                      aria-label={t('users.buttons.edit')}
                    >
                      <Button
                        size="small"
                        variant="primary"
                        aria-labelledby={`username-${user.login} edit-${user.login}`}
                        icon={<EditIcon />}
                        aria-haspopup="dialog"
                        onClick={() => {
                          setEditedUser({ ...user, readOnly: user.type === 'admin' && store.onlyOneAdmin });
                        }}
                      />
                    </Tooltip>

                    <Tooltip
                      id={`delete-${user.login}`}
                      text={t('users.buttons.delete')}
                      aria-label={t('users.buttons.delete')}
                    >
                      <Button
                        size="small"
                        variant="danger"
                        icon={<TrashIcon />}
                        disabled={user.type === 'admin' && store.onlyOneAdmin}
                        aria-labelledby={`username-${user.login} delete-${user.login}`}
                        aria-haspopup="dialog"
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
        </>
      ) : (
        <Alert variant="info">
          {t('users.labels.empty-list')}
        </Alert>
      )}

      <Alert className="users-rolesList" variant="info" withIcon={false}>
        <dl>
          <div className="users-rolesItem">
            <dt><strong>{t('users.labels.user')}</strong></dt>
            <dd>{t('users.labels.role-user-desc')}</dd>
          </div>
          <div className="users-rolesItem">
            <dt><strong>{t('users.labels.operator')}</strong></dt>
            <dd>{t('users.labels.role-operator-desc')}</dd>
          </div>
          <div className="users-rolesItem">
            <dt><strong>{t('users.labels.admin')}</strong></dt>
            <dd>{t('users.labels.role-admin-desc')}</dd>
          </div>
        </dl>
      </Alert>

      {editedUser && (
        <EditUserModal
          user={editedUser}
          isLoading={isSaving}
          isFirstUser={!authStore.areUsersConfigured}
          isCurrentUser={editedUser.id === authStore.me?.id}
          onSave={save}
          onCancel={() => {
            setEditedUser(null);
          }}
        />
      )}

      <Confirm
        width={650}
        isOpened={isOpened}
        heading={t('users.labels.https')}
        closeCallback={() => handleClose()}
        footerActions={
          <>
            <Button
              className="confirm-action"
              label={t('users.buttons.use-http')}
              variant="secondary"
              onClick={() => handleConfirm('http')}
            />
            <Button
              className="confirm-action"
              label={t('users.buttons.enable-https')}
              variant="primary"
              onClick={() => handleConfirm('https')}
            />
          </>
        }
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
          isLoading={isDeleting}
          acceptLabel={t('users.buttons.delete')}
          closeCallback={() => setDeletedUserId(null)}
          confirmCallback={() => deleteUser(deletedUserId)}
        >
          {
            t(
              'users.labels.confirm-delete',
              { name: authStore.users.find((user) => user.id === deletedUserId)?.login })
          }
        </Confirm>
      )}
    </PageLayout>
  );
});

export default UsersPage;
