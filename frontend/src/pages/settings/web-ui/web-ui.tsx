import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { CommonSettings } from './components/common';
import { HttpsSettings } from './components/https';
import { MqttSettings } from './components/mqtt';
import { PanelsSettings } from './components/panels';
import './styles.css';

const WebUiSettingsPage = () => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState([]);

  const httpsErrorHandler = (error: string) => {
    if (error) {
      setErrors([{ variant: 'danger', text: error }]);
    } else {
      setErrors([]);
    }
  };

  return (
    <PageLayout title={t('web-ui-settings.title')} errors={errors} hasRights>
      <div className="web-ui-settings-pageContent">
        <CommonSettings />
        {authStore.hasRights(UserRole.Operator) && <MqttSettings />}
        {authStore.hasRights(UserRole.Operator) && <PanelsSettings />}
        {authStore.hasRights(UserRole.Admin) && <HttpsSettings onError={httpsErrorHandler} />}
      </div>
    </PageLayout>
  );
};

export default WebUiSettingsPage;
