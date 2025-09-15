import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { BooleanField, FromFieldGroup, FromButtonGroup } from '@/components/form';

const HttpsSettings = ({ httpsIsEnabled } : { httpsIsEnabled: boolean }) => {
  const { t } = useTranslation();
  const [isHttpsEnabled, setIsHttpsEnabled] = useState(httpsIsEnabled);
  const [disableApply, setDisableApply] = useState(true);

  const setIsHttpsEnabledHandler = (value: boolean) => {
    setIsHttpsEnabled(value);
    setDisableApply(httpsIsEnabled === value);
  };

  const applyHandler = () => {
  };

  return (
    <FromFieldGroup heading={t('web-ui-settings.labels.https-settings')}>
      <BooleanField
        title={t('web-ui-settings.labels.enable-https')}
        value={isHttpsEnabled}
        onChange={setIsHttpsEnabledHandler}
      />
      <FromButtonGroup>
        <Button
          label={t('common.buttons.apply')}
          variant="secondary"
          disabled={disableApply}
          onClick={applyHandler}
        />
      </FromButtonGroup>
    </FromFieldGroup>
  );
};

export default HttpsSettings;
