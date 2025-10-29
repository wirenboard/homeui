import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import CommonSettings from './components/common-settings';
import HttpsSettings from './components/https-settings';
import MqttSettings from './components/mqtt-settings';
import type { WebUiSettingsPageProps } from './types';
import './styles.css';

const WebUiSettingsPage = ({ onChangeLanguage, dashboardsStore }: WebUiSettingsPageProps) => {
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
        {authStore.hasRights(UserRole.Operator) && <MqttSettings />}
        <CommonSettings dashboardsStore={dashboardsStore} onChangeLanguage={onChangeLanguage} />
        {authStore.hasRights(UserRole.Admin) && <HttpsSettings onError={httpsErrorHandler} />}
      </div>
    </PageLayout>
  );
};

export default WebUiSettingsPage;
