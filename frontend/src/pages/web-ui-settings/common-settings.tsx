import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Option } from '@/components/dropdown';
import { BooleanField, FromFieldGroup, OptionsField } from '@/components/form';
import { CommonSettingsProps } from './types';

const CommonSettings = ({
  onChangeLanguage,
  dashboards,
  defaultDashboardId,
  onChangeDefaultDashboard,
}: CommonSettingsProps) => {
  const { t } = useTranslation();
  const [showSystemDevices, setShowSystemDevices] = useState((localStorage['show-system-devices'] || 'no') === 'yes');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  const options = dashboards.map((d) => ({ label: d.name, value: d.id }));
  const [defaultDashboard, setDefaultDashboard] = useState(defaultDashboardId);

  const setShowSystemDevicesHandler = (value: boolean) => {
    localStorage.setItem('show-system-devices', value ? 'yes' : 'no');
    setShowSystemDevices(value);
  };

  const onChangeLanguageHandler = (lang: Option<string>) => {
    localStorage.setItem('language', lang.value);
    onChangeLanguage(lang.value);
    setLanguage(lang.value);
  };

  const onChangeDefaultDashboardHandler = (dashboard: Option<string>) => {
    onChangeDefaultDashboard(dashboard.value);
    setDefaultDashboard(dashboard.value);
  };

  const languageOptions: Option<string>[] = [
    { label: 'English', value: 'en' },
    { label: 'Русский', value: 'ru' },
  ];

  return (
    <FromFieldGroup heading={t('web-ui-settings.labels.common-settings')}>
      <OptionsField
        title={t('web-ui-settings.labels.default-dashboard')}
        value={defaultDashboard}
        options={options}
        onChange={onChangeDefaultDashboardHandler}
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
    </FromFieldGroup>
  );
};

export default CommonSettings;
