import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export const Passkeys = () => {
  const { t, i18n } = useTranslation();
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [name, setName] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [credentialToDelete, setCredentialToDelete] = useState<PasskeyCredential>();
  const [confirm, isConfirmOpened, handleConfirm, handleClose] = useConfirm<boolean>() as [
    (data?: boolean) => Promise<boolean | null>,
    boolean,
    (data: boolean) => void,
    (data: boolean) => void,
    boolean | null
  ];

  const [loadCredentials, isLoading] = useAsyncAction(async () => {
    const config = await getWebAuthnConfig();
    setIsEnabled(config.enabled);
    if (config.enabled) {
      setCredentials(await getPasskeys());
    }
    setIsLoaded(true);
  });

  useEffect(() => {
    loadCredentials().catch(() => setIsLoaded(true));
  }, []);

  const [addCredential, isAdding] = useAsyncAction(async () => {
    const credential = await registerPasskey(name);
    setCredentials((items) => [...items, credential]);
    setName('');
  });

  const [removeCredential, isDeleting] = useAsyncAction(async (credential: PasskeyCredential) => {
    await deletePasskey(credential.id);
    setCredentials((items) => items.filter(({ id }) => id !== credential.id));
  });

  const askToRemoveCredential = async (credential: PasskeyCredential) => {
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
      <h2>{t('users.labels.passkeys')}</h2>
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
            placeholder={t('users.labels.passkey-name-placeholder')}
            value={name}
            isFullWidth
            onChange={(value) => setName(String(value))}
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
        {credentialToDelete?.name}
      </Confirm>
    </section>
  );
};
