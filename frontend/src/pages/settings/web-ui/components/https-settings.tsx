import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BooleanField, FormFieldGroup } from '@/components/form';
import { setupHttps, isHttpsEnabled } from '@/utils/httpsUtils';
import type { HttpsSettingsProps } from '../types';

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
    if (value === switchState) {
      return;
    }
    setDisabled(true);
    setSwitchState(value);
    setupHttps(value).then(() => {
      onError('');
    }).catch((e) => {
      setSwitchState(false);
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
    </FormFieldGroup>
  );
};

export default HttpsSettings;
