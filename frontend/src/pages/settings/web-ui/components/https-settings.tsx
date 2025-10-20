import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { BooleanField, FormFieldGroup } from '@/components/form';
import { setupHttps, isHttpsEnabled, getHttpsCertificateStatus, CertificateStatus } from '@/utils/httpsUtils';
import type { HttpsSettingsProps } from '../types';

const CertStatusBanner = () => {
  const { t } = useTranslation();
  const [certStatus, setCertStatus] = useState<CertificateStatus | null >(null);

  useEffect(() => {
    let requestRetryTimeoutId;
    const retryCheckCertStatus = () => {
      getHttpsCertificateStatus().then((newStatus) => {
        if (newStatus !== CertificateStatus.REQUESTING) {
          setCertStatus(newStatus);
        } else {
          requestRetryTimeoutId = setTimeout(retryCheckCertStatus, 2000);
        }
      }).catch(() => {
        requestRetryTimeoutId = setTimeout(retryCheckCertStatus, 2000);
      });
    };
    retryCheckCertStatus();
    return () => clearTimeout(requestRetryTimeoutId);
  }, []);

  let content: string;
  let variant: 'info' | 'success' | 'danger';

  switch (certStatus) {
    case CertificateStatus.VALID:
      content = t('web-ui-settings.labels.https-cert-valid');
      variant = 'success';
      break;
    case CertificateStatus.REQUESTING:
      content = t('web-ui-settings.labels.https-cert-requesting');
      variant = 'info';
      break;
    case CertificateStatus.UNAVAILABLE:
      content = t('web-ui-settings.labels.https-cert-unavailable');
      variant = 'danger';
      break;
    default:
      content = t('web-ui-settings.labels.getting-https-cert-status');
      variant = 'info';
  }

  return <Alert variant={variant}>{content}</Alert>;
};

const HttpsSettings = ({ onError }: HttpsSettingsProps) => {
  const { t } = useTranslation();
  const [switchState, setSwitchState] = useState(false);
  const [disabled, setDisabled] = useState(true);

  useEffect(() => {
    isHttpsEnabled().then((enabled: boolean) => {
      setSwitchState(enabled);
      setDisabled(false);
    }).catch((e) => {
      onError(t('web-ui-settings.errors.get-https-status', { error: e.message }));
    });
  }, []);

  const setSwitchStateHandler = (value: boolean) => {
    setDisabled(true);
    setSwitchState(value);
    setupHttps(value).then(() => {
      onError('');
    }).catch((e) => {
      setSwitchState(!value);
      onError(t('web-ui-settings.errors.setup-https', { error: e.message }));
    }).finally(() => {
      setDisabled(false);
    });
  };

  return (
    <FormFieldGroup heading={t('web-ui-settings.labels.https-settings')}>
      <BooleanField
        title={t('web-ui-settings.labels.enable-https')}
        value={switchState}
        isDisabled={disabled}
        description={t('web-ui-settings.labels.enable-https-description')}
        onChange={setSwitchStateHandler}
      />
      {switchState && <CertStatusBanner />}
    </FormFieldGroup>
  );
};

export default HttpsSettings;
