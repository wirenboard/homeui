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

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 1) {
    return [];
  }

  const pages = new Set<number>();
  pages.add(0);
  pages.add(total - 1);

  for (let i = Math.max(0, current - 2); i <= Math.min(total - 1, current + 2); i++) {
    pages.add(i);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | '...')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('...');
    }
    result.push(sorted[i]);
  }

  return result;
}

const UsersPage = observer(() => {
  const { t } = useTranslation();
  const [deletedUserId, setDeletedUserId] = useState('');
  const [ confirm, isOpened, handleConfirm, handleClose ] = useConfirm<any>();
  const [ userSave, userEditOpened, saveUser, closeUserEdit ] = useConfirm<any>();
  const [ editedUser, setEditedUser ] = useState<any>();

  useEffect(() => {
    if (authStore.hasRights(UserRole.Admin)) {
      store.loadUsers();
      store.loadAuthLog();
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
      {/* flex-shrink: 0 prevents the users table from collapsing in the flex page layout */}
      <Table style={{ flexShrink: 0 }}>
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
          onChange={(option: Option<string>) => {
            if ('value' in option) {
              store.setAutologinUser(option.value);
            }
          }}
        />
      </label>

      <div className="users-auth-log">
        <h1 className="users-auth-log-title">
          {t('users.labels.auth-log-title')}
        </h1>

        <div
          className={store.authLogLoading
            ? 'users-auth-log-content users-auth-log-content_loading'
            : 'users-auth-log-content'}
        >
          <Table>
            <TableRow isHeading>
              <TableCell width="15%">
                {t('users.labels.auth-log-time')}
              </TableCell>
              <TableCell width="10%">
                {t('users.labels.auth-log-login')}
              </TableCell>
              <TableCell width="8%">
                {t('users.labels.auth-log-result')}
              </TableCell>
              <TableCell width="12%">
                {t('users.labels.auth-log-ip')}
              </TableCell>
              <TableCell width="55%">
                {t('users.labels.auth-log-user-agent')}
              </TableCell>
            </TableRow>

            {store.authLog.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  {new Date(entry.timestamp * 1000).toLocaleString()}
                </TableCell>
                <TableCell ellipsis>
                  {entry.login}
                </TableCell>
                <TableCell>
                  <span
                    className={entry.success
                      ? 'users-auth-log-result users-auth-log-result_success'
                      : 'users-auth-log-result users-auth-log-result_failed'}
                  >
                    {entry.success
                      ? `✓ ${t('users.labels.auth-log-success')}`
                      : `✗ ${t('users.labels.auth-log-failed')}`}
                  </span>
                </TableCell>
                <TableCell ellipsis>
                  {entry.ip}
                </TableCell>
                <TableCell ellipsis>
                  {entry.user_agent}
                </TableCell>
              </TableRow>
            ))}
          </Table>

          {!store.authLogLoading && store.authLog.length === 0 && (
            <div className="users-auth-log-empty">
              {t('users.labels.auth-log-empty')}
            </div>
          )}
        </div>

        {/* Pagination controls are outside the scrollable content area */}
        <div className="users-auth-log-pagination">
          <Button
            label={`← ${t('users.labels.auth-log-prev-page')}`}
            variant="secondary"
            disabled={store.authLogLoading || store.authLogPage === 0}
            onClick={() => store.loadAuthLogPage(store.authLogPage - 1)}
          />

          {buildPageNumbers(store.authLogPage, store.authLogTotalPages).map((item, index) => (
            item === '...'
              ? (
                <span key={`ellipsis-${index}`} className="users-auth-log-ellipsis">
                  ...
                </span>
              )
              : (
                <Button
                  key={item}
                  label={String(item + 1)}
                  variant={item === store.authLogPage ? 'primary' : 'secondary'}
                  disabled={store.authLogLoading}
                  onClick={() => store.loadAuthLogPage(item)}
                />
              )
          ))}

          <Button
            label={`${t('users.labels.auth-log-next-page')} →`}
            variant="secondary"
            disabled={store.authLogLoading || store.authLogPage >= store.authLogTotalPages - 1}
            onClick={() => store.loadAuthLogPage(store.authLogPage + 1)}
          />
        </div>
      </div>

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
