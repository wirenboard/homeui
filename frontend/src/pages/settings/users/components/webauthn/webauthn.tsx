import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PlusIcon from '@/assets/icons/plus.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Confirm, useConfirm } from '@/components/confirm';
import { StringField } from '@/components/form';
import { Table, TableCell, TableRow } from '@/components/table';
import { Tooltip } from '@/components/tooltip';
import { getWebAuthnConfig, setWebAuthnConfig } from '@/services/webauthn';
import { useAsyncAction } from '@/utils/async-action';
import type { DomainValidationError, WebAuthnSettingsProps } from './types';

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

const isBareIp = (value: string): boolean => {
  const match = value.match(IPV4_PATTERN);
  if (!match) {
    return false;
  }
  return match.slice(1).every((octet) => Number(octet) >= 0 && Number(octet) <= 255);
};

const validateDomainCandidate = (value: string): DomainValidationError | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'empty';
  }
  if (isBareIp(trimmed)) {
    return 'ip';
  }
  return null;
};

export const WebAuthnSettings = ({ onError, onDomainsChange }: WebAuthnSettingsProps) => {
  const { t } = useTranslation();
  const [domains, setDomains] = useState<string[]>([]);
  const [httpsReady, setHttpsReady] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [isAddModalOpened, setIsAddModalOpened] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<string>();
  const [confirm, isConfirmOpened, handleConfirm, handleClose] = useConfirm<any>();

  const updateDomains = (nextDomains: string[]) => {
    setDomains(nextDomains);
    onDomainsChange?.(nextDomains);
  };

  const [loadConfig, isLoading] = useAsyncAction(async () => {
    const config = await getWebAuthnConfig();
    updateDomains(config.domains ?? []);
    setHttpsReady(!!config.https_ready);
    setIsLoaded(true);
  });

  useEffect(() => {
    loadConfig().catch((err) => {
      setIsLoaded(true);
      onError(t('web-ui-settings.errors.get-webauthn-status', {
        error: err?.message || err, interpolation: { escapeValue: false },
      }));
    });
  }, []);

  useEffect(() => {
    if (!isLoaded || httpsReady) {
      return undefined;
    }
    let timeoutId: ReturnType<typeof setTimeout>;
    const recheck = () => {
      getWebAuthnConfig().then((config) => {
        if (config.https_ready) {
          setHttpsReady(true);
        } else {
          timeoutId = setTimeout(recheck, 2000);
        }
      }).catch(() => {
        timeoutId = setTimeout(recheck, 2000);
      });
    };
    timeoutId = setTimeout(recheck, 2000);
    return () => clearTimeout(timeoutId);
  }, [isLoaded, httpsReady]);

  const [applyDomains, isSaving] = useAsyncAction(async (nextDomains: string[]) => {
    try {
      const config = await setWebAuthnConfig(nextDomains);
      updateDomains(config.domains ?? []);
      setHttpsReady(!!config.https_ready);
      return null;
    } catch (err) {
      return t('web-ui-settings.errors.setup-webauthn', {
        error: err?.response?.data || err?.message || err,
        interpolation: { escapeValue: false },
      });
    }
  });

  const isDisabled = !isLoaded || isLoading || isSaving || !httpsReady;

  const openAddModal = () => {
    setNewDomain('');
    setFieldError('');
    setIsAddModalOpened(true);
  };

  const addDomain = async () => {
    const domain = newDomain.trim();
    const validationError = validateDomainCandidate(domain);
    if (validationError) {
      setFieldError(t(`web-ui-settings.errors.webauthn-domain-${validationError}`));
      return;
    }
    if (domains.includes(domain)) {
      setFieldError(t('web-ui-settings.errors.webauthn-domain-duplicate'));
      return;
    }
    setFieldError('');
    onError('');
    const error = await applyDomains([...domains, domain]);
    if (error) {
      setFieldError(error);
      return;
    }
    setIsAddModalOpened(false);
  };

  const removeDomain = async (domain: string) => {
    const error = await applyDomains(domains.filter((item) => item !== domain));
    onError(error ?? '');
  };

  const askRemoveDomain = async (domain: string) => {
    if (domain !== domains[0]) {
      await removeDomain(domain);
      return;
    }
    setPendingRemoval(domain);
    try {
      if (await confirm()) {
        await removeDomain(domain);
      }
    } finally {
      setPendingRemoval(undefined);
    }
  };

  return (
    <>
      {isLoaded && !httpsReady && (
        <Alert variant="warn">{t('web-ui-settings.labels.webauthn-needs-https')}</Alert>
      )}

      <Table isFullWidth>
        <TableRow isHeading>
          <TableCell>{t('web-ui-settings.labels.webauthn-settings')}</TableCell>
          <TableCell width="1%" align="right">
            <Tooltip text={t('web-ui-settings.buttons.webauthn-add-domain')}>
              <Button
                size="small"
                variant="primary"
                icon={<PlusIcon />}
                aria-label={t('web-ui-settings.buttons.webauthn-add-domain')}
                aria-haspopup="dialog"
                disabled={isDisabled}
                onClick={openAddModal}
              />
            </Tooltip>
          </TableCell>
        </TableRow>
        {domains.length ? domains.map((domain) => (
          <TableRow key={domain}>
            <TableCell ellipsis>{domain}</TableCell>
            <TableCell align="right">
              <Tooltip text={t('web-ui-settings.buttons.webauthn-remove-domain')}>
                <Button
                  size="small"
                  variant="danger"
                  icon={<TrashIcon />}
                  aria-label={t('web-ui-settings.buttons.webauthn-remove-domain')}
                  disabled={isDisabled}
                  onClick={() => askRemoveDomain(domain)}
                />
              </Tooltip>
            </TableCell>
          </TableRow>
        )) : (
          <TableRow>
            <TableCell colSpan={2}>
              <p>{t('web-ui-settings.labels.webauthn-domains-empty')}</p>
            </TableCell>
          </TableRow>
        )}
      </Table>

      <Confirm
        isOpened={isAddModalOpened}
        heading={t('web-ui-settings.buttons.webauthn-add-domain')}
        acceptLabel={t('web-ui-settings.buttons.webauthn-add-domain')}
        isLoading={isSaving}
        closeCallback={() => setIsAddModalOpened(false)}
        confirmCallback={addDomain}
      >
        <StringField
          ariaLabel={t('web-ui-settings.labels.webauthn-new-domain')}
          value={newDomain}
          error={fieldError}
          isDisabled={isSaving}
          onChange={(value) => {
            setNewDomain(String(value));
            setFieldError('');
          }}
        />
      </Confirm>

      <Confirm
        isOpened={isConfirmOpened}
        heading={t('web-ui-settings.labels.webauthn-confirm-heading')}
        variant="danger"
        isLoading={isSaving}
        acceptLabel={t('web-ui-settings.buttons.webauthn-confirm-continue')}
        closeCallback={() => handleClose(false)}
        confirmCallback={() => handleConfirm(true)}
      >
        {t('web-ui-settings.labels.webauthn-confirm-remove-primary', {
          domain: pendingRemoval,
          interpolation: { escapeValue: false },
        })}
      </Confirm>
    </>
  );
};
