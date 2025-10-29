import debounce from 'lodash/debounce';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Option } from '@/components/dropdown';
import { BooleanField, FormFieldGroup, OptionsField, StringField } from '@/components/form';
import { authStore, UserRole } from '@/stores/auth';
import { CommonSettingsProps } from '../types';

const CommonSettings = observer(({ onChangeLanguage, dashboardsStore }: CommonSettingsProps) => {
  const { t } = useTranslation();
  const [showSystemDevices, setShowSystemDevices] = useState((localStorage['show-system-devices'] || 'no') === 'yes');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  const options = dashboardsStore.dashboardsList
    .filter((dashboard) => !dashboard.options.isHidden)
    .map((dashboard) => ({ label: dashboard.name, value: dashboard.id }));

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

  const debouncedNameChange = useMemo(
    () => debounce((value: string) => dashboardsStore.setDescription(value), 1000),
    []
  );

  return (
    <FormFieldGroup heading={t('web-ui-settings.labels.common-settings')}>
      <OptionsField
        title={t('web-ui-settings.labels.default-dashboard')}
        value={dashboardsStore.defaultDashboardId}
        options={options}
        isDisabled={dashboardsStore.isLoading}
        onChange={(id: string) => dashboardsStore.setDefaultDashboardId(id)}
      />
      <OptionsField
        title={t('web-ui-settings.labels.language')}
        value={language}
        options={languageOptions}
        onChange={onChangeLanguageHandler}
      />
      {authStore.hasRights(UserRole.Operator) && (
        <StringField
          title={t('web-ui-settings.labels.name')}
          description={t('web-ui-settings.labels.name-description')}
          value={dashboardsStore.description}
          onChange={debouncedNameChange}
        />
      )}
      <BooleanField
        title={t('web-ui-settings.labels.show-system-devices')}
        value={showSystemDevices}
        onChange={setShowSystemDevicesHandler}
      />
    </FormFieldGroup>
  );
});

export default CommonSettings;
