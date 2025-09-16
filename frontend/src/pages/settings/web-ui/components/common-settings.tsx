import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Option } from '@/components/dropdown';
import { BooleanField, FormFieldGroup, OptionsField } from '@/components/form';
import { CommonSettingsProps } from '../types';

const CommonSettings = observer(({ onChangeLanguage, dashboardStore }: CommonSettingsProps) => {
  const { t } = useTranslation();
  const [showSystemDevices, setShowSystemDevices] = useState((localStorage['show-system-devices'] || 'no') === 'yes');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  const options = Array.from(dashboardStore.dashboards.values()).map((d) => ({ label: d.name, value: d.id }));

  useEffect(() => {
    let interval = null;
    let attempt = 0;

    // Sometimes the request finishes before the MQTT connection is established.
    // In that case we retry every 3 seconds until success.
    // The error message is displayed starting from the second attempt.
    const fetchData = () => {
      attempt++;
      dashboardStore.loadData()
        .then(() => {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        })
        .catch((error: any) => {
          if (attempt > 1 && error.data === 'MqttConnectionError') {
            dashboardStore.setLoading(false);
          }
          if (!interval) {
            interval = setInterval(fetchData, 3000);
          }
        });
    };

    fetchData();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const setShowSystemDevicesHandler = (value: boolean) => {
    localStorage.setItem('show-system-devices', value ? 'yes' : 'no');
    setShowSystemDevices(value);
  };

  const onChangeLanguageHandler = (lang: string) => {
    localStorage.setItem('language', lang);
    onChangeLanguage(lang);
    setLanguage(lang);
  };

  const languageOptions: Option<string>[] = [
    { label: 'English', value: 'en' },
    { label: 'Русский', value: 'ru' },
  ];

  return (
    <FormFieldGroup heading={t('web-ui-settings.labels.common-settings')}>
      <OptionsField
        title={t('web-ui-settings.labels.default-dashboard')}
        value={dashboardStore.defaultDashboardId}
        options={options}
        isDisabled={dashboardStore.isLoading}
        onChange={(id:string) => dashboardStore.setDefaultDashboardId(id)}
      />
      <OptionsField
        title={t('web-ui-settings.labels.language')}
        value={language}
        options={languageOptions}
        onChange={onChangeLanguageHandler}
      />
      <BooleanField
        title={t('web-ui-settings.labels.show-system-devices')}
        value={showSystemDevices}
        onChange={setShowSystemDevicesHandler}
      />
    </FormFieldGroup>
  );
});

export default CommonSettings;
