import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/layouts/page';
import CommonSettings from './components/common-settings';
import HttpsSettings from './components/https-settings';
import MqttSettings from './components/mqtt-settings';
import type { WebUiSettingsPageProps } from './types';
import './styles.css';

const WebUiSettingsPage = ({ onChangeLanguage, dashboardsStore, userType }: WebUiSettingsPageProps) => {
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
    <PageLayout title={t('web-ui-settings.title')} hasRights={true} errors={errors}>
      <div className="web-ui-settings-pageContent">
        {userType !== 'user' && <MqttSettings />}
        <CommonSettings dashboardsStore={dashboardsStore} onChangeLanguage={onChangeLanguage} />
        {userType === 'admin' && <HttpsSettings onError={httpsErrorHandler} />}
      </div>
    </PageLayout>
  );
};

export default WebUiSettingsPage;
