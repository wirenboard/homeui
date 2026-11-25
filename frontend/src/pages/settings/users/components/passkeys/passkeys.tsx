import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { MAX_MOBILE_WIDTH } from '@/common/breakpoints';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Confirm, useConfirm } from '@/components/confirm';
import { Input } from '@/components/input';
import {
  classifyWebAuthnError,
  deletePasskey,
  getPasskeys,
  registerPasskey,
  type PasskeyCredential,
} from '@/services/webauthn';
import { useAsyncAction } from '@/utils/async-action';
import { PasskeysList } from './passkeys-list';
import { PasskeysTable } from './passkeys-table';
import './styles.css';
import type { PasskeysProps } from './types';

export const Passkeys = ({ userId }: PasskeysProps) => {
  const { t, i18n } = useTranslation();
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [name, setName] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [credentialToDelete, setCredentialToDelete] = useState<PasskeyCredential>();
  const [error, setError] = useState('');
  const [confirm, isConfirmOpened, handleConfirm, handleClose] = useConfirm<any>();
  const PasskeysView = useMediaQuery({ maxWidth: MAX_MOBILE_WIDTH }) ? PasskeysList : PasskeysTable;

  const errorText = (key: string, err: any) => t(key, {
    msg: err?.message || err, interpolation: { escapeValue: false },
  });

  useEffect(() => {
    getPasskeys(userId)
      .then((items) => {
        setCredentials(items);
        setIsLoaded(true);
      })
      .catch((err) => setLoadError(errorText('users.errors.passkeys-load-failed', err)));
  }, [userId]);

  const [addCredential, isAdding] = useAsyncAction(async () => {
    setError('');
    try {
      const credential = await registerPasskey(userId, name);
      setCredentials((items) => [...items, credential]);
      setName('');
    } catch (err) {
      const reason = classifyWebAuthnError(err);
      if (['unsupported-origin', 'already-registered', 'device-refused'].includes(reason)) {
        setError(t(`users.errors.passkey-register-${reason}`));
      } else {
        setError(errorText('users.errors.passkey-register-failed', err));
      }
    }
  });

  const [removeCredential, isDeleting] = useAsyncAction(async (credential: PasskeyCredential) => {
    try {
      await deletePasskey(userId, credential.id);
      setCredentials((items) => items.filter(({ id }) => id !== credential.id));
    } catch (err) {
      setError(errorText('users.errors.passkey-delete-failed', err));
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

  if (loadError) {
    return (
      <section className="passkeys">
        <Alert variant="danger">{loadError}</Alert>
      </section>
    );
  }
  if (!isLoaded) {
    return null;
  }

  const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : t('users.labels.passkey-never-used');

  return (
    <section className="passkeys">
      <p className="passkeys-intro">{t('users.labels.passkeys-intro')}</p>
      {!!error && (
        <Alert variant="danger" size="small" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <div className="passkeys-add">
        <label className="passkeys-label" htmlFor="passkey-name">
          {t('users.labels.passkey-name')}
        </label>
        <Input
          className="passkeys-input"
          id="passkey-name"
          ariaLabel={t('users.labels.passkey-name')}
          value={name}
          maxLength={80}
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

      {credentials.length ? (
        <PasskeysView
          rows={credentials.map((credential) => ({
            credential,
            domain: credential.domain?.endsWith('.ip.wirenboard.com') ? `*.${credential.domain}` : credential.domain,
            createdAt: formatDate(credential.created_at),
            lastUsedAt: formatDate(credential.last_used_at),
          }))}
          onDelete={askToRemoveCredential}
        />
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
