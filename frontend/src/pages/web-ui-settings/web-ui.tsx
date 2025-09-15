import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/layouts/page';
import './styles.css';
import CommonSettings from './common-settings';
import HttpsSettings from './https-settings';
import MqttSettings from './mqtt-settings';
import type { WebUiSettingsPageProps, Dashboard } from './types';

const WebUiSettingsPage = ({
  onChangeLanguage,
  whenUIConfigReady,
  onChangeDefaultDashboard,
}: WebUiSettingsPageProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [defaultDashboardId, setDefaultDashboardId] = useState<string | null>(null);

  useEffect(() => {
    whenUIConfigReady()
      .then((config) => {
        setDashboards(config.dashboards.map((d) => ({ id: d.id, name: d.name })));
        setDefaultDashboardId(config.defaultDashboardId);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        setErrors(['Error loading WebUI config']);
      });
  }, []);

  return (
    <PageLayout title={t('web-ui-settings.title')} hasRights={true} isLoading={isLoading} errors={errors} stickyHeader>
      <MqttSettings />
      <CommonSettings
        dashboards={dashboards}
        defaultDashboardId={defaultDashboardId}
        onChangeLanguage={onChangeLanguage}
        onChangeDefaultDashboard={onChangeDefaultDashboard}
      />
      <HttpsSettings httpsIsEnabled={false} />
    </PageLayout>
  );
};

export default WebUiSettingsPage;
