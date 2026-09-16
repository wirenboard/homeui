import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Confirm, useConfirm } from '@/components/confirm';
import { Input } from '@/components/input';
import { Table, TableCell, TableRow } from '@/components/table';
import {
  canUseWebAuthn,
  deletePasskey,
  getPasskeys,
  getWebAuthnConfig,
  registerPasskey,
  type PasskeyCredential,
} from '@/services/webauthn';
import { useAsyncAction } from '@/utils/async-action';
import './styles.css';
import type { PasskeysProps } from './types';

export const Passkeys = ({ userId }: PasskeysProps) => {
  const { t, i18n } = useTranslation();
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [name, setName] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [credentialToDelete, setCredentialToDelete] = useState<PasskeyCredential>();
  const [error, setError] = useState('');
  const [confirm, isConfirmOpened, handleConfirm, handleClose] = useConfirm<any>();

  const [loadCredentials, isLoading] = useAsyncAction(async () => {
    const config = await getWebAuthnConfig();
    setIsEnabled(config.enabled);
    if (config.enabled) {
      setCredentials(await getPasskeys(userId));
    }
    setIsLoaded(true);
  });

  useEffect(() => {
    loadCredentials().catch(() => setIsLoaded(true));
  }, [userId]);

  const [addCredential, isAdding] = useAsyncAction(async () => {
    setError('');
    try {
      const credential = await registerPasskey(userId, name);
      setCredentials((items) => [...items, credential]);
      setName('');
    } catch (err) {
      setError(t('users.errors.passkey-register-failed', {
        msg: err?.message || err, interpolation: { escapeValue: false },
      }));
    }
  });

  const [removeCredential, isDeleting] = useAsyncAction(async (credential: PasskeyCredential) => {
    try {
      await deletePasskey(userId, credential.id);
      setCredentials((items) => items.filter(({ id }) => id !== credential.id));
    } catch (err) {
      setError(t('users.errors.passkey-delete-failed', {
        msg: err?.message || err, interpolation: { escapeValue: false },
      }));
    }
  });

  const askToRemoveCredential = async (credential: PasskeyCredential) => {
    setError('');
    setCredentialToDelete(credential);
    try {
      if (await confirm()) {
        await removeCredential(credential);
      }
    } finally {
      setCredentialToDelete(undefined);
    }
  };

  if (!isLoaded && isLoading) {
    return null;
  }
  if (!isEnabled) {
    return null;
  }

  const formatDate = (value?: string) => value
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : t('users.labels.passkey-never-used');

  return (
    <section className="passkeys">
      {!!error && (
        <Alert variant="danger" size="small" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {!canUseWebAuthn() ? (
        <Alert variant="warn">{t('users.labels.passkeys-unavailable')}</Alert>
      ) : (
        <div className="passkeys-add">
          <label className="passkeys-label" htmlFor="passkey-name">
            {t('users.labels.passkey-name')}
          </label>
          <Input
            className="passkeys-input"
            id="passkey-name"
            ariaLabel={t('users.labels.passkey-name')}
            value={name}
            isFullWidth
            onChange={(value) => setName(String(value))}
            onEnter={() => {
              if (name.trim()) {
                addCredential();
              }
            }}
          />
          <Button
            className="passkeys-register"
            label={t('users.buttons.add-passkey')}
            disabled={!name.trim()}
            isLoading={isAdding}
            onClick={addCredential}
          />
          <span className="passkeys-hint">
            {t('users.labels.passkey-name-hint')}
          </span>
        </div>
      )}

      {credentials.length ? (
        <Table>
          <TableRow isHeading>
            <TableCell width="35%">{t('users.labels.passkey-name')}</TableCell>
            <TableCell width="30%">{t('users.labels.passkey-created')}</TableCell>
            <TableCell width="30%">{t('users.labels.passkey-last-used')}</TableCell>
            <TableCell width={70} />
          </TableRow>
          {credentials.map((credential) => (
            <TableRow key={credential.id}>
              <TableCell ellipsis>{credential.name}</TableCell>
              <TableCell>{formatDate(credential.created_at)}</TableCell>
              <TableCell>{formatDate(credential.last_used_at)}</TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  variant="danger"
                  icon={<TrashIcon />}
                  aria-label={t('users.buttons.delete-passkey')}
                  onClick={() => askToRemoveCredential(credential)}
                />
              </TableCell>
            </TableRow>
          ))}
        </Table>
      ) : (
        <Alert variant="info">{t('users.labels.passkeys-empty')}</Alert>
      )}

      <Confirm
        isOpened={isConfirmOpened}
        heading={t('users.buttons.delete-passkey')}
        variant="danger"
        isLoading={isDeleting}
        acceptLabel={t('users.buttons.delete-passkey')}
        closeCallback={() => {
          handleClose(false);
        }}
        confirmCallback={() => handleConfirm(true)}
      >
        <Trans
          i18nKey="users.labels.confirm-delete-passkey"
          values={{ name: credentialToDelete?.name }}
          components={[<b key="passkey-name" />]}
          shouldUnescape
        />
      </Confirm>
    </section>
  );
};
