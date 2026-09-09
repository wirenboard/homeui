import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { type Option } from '@/components/dropdown';
import { BooleanField, FormButtonGroup, FormFieldGroup, OptionsField, StringField } from '@/components/form';
import { authStore, UserRole } from '@/stores/auth';
import { dashboardsStore } from '@/stores/dashboards';
import { Theme, uiStore } from '@/stores/ui';

export const CommonSettings = observer(() => {
  const { t, i18n } = useTranslation();
  const [showSystemDevices, setShowSystemDevices] = useState((localStorage['show-system-devices'] || 'no') === 'yes');
  const [showPageInTitle, setShowPageInTitle] = useState(uiStore.showPageInTitle);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  const [theme, setTheme] = useState<Theme>(uiStore.theme);
  const [description, setDescription] = useState('');

  useEffect(() => {
    setDescription(dashboardsStore.description ?? '');
  }, [dashboardsStore.description]);

  const languageOptions: Option<string>[] = [
    { label: 'English', value: 'en' },
    { label: 'Русский', value: 'ru' },
  ];

  const themeOptions: Option<Theme>[] = [
    { label: t('web-ui-settings.labels.theme-light'), value: Theme.Light },
    { label: t('web-ui-settings.labels.theme-dark'), value: Theme.Dark },
    { label: t('web-ui-settings.labels.theme-system'), value: Theme.System },
    { label: 'Bootstrap', value: Theme.Bootstrap },
  ];

  const applyHandler = async () => {
    localStorage.setItem('show-system-devices', showSystemDevices ? 'yes' : 'no');
    uiStore.setShowPageInTitle(showPageInTitle);
    localStorage.setItem('language', language);
    await i18n.changeLanguage(language);
    uiStore.setTheme(theme);
    dashboardsStore.setDescription(description);
  };

  return (
    <FormFieldGroup heading={t('web-ui-settings.labels.common-settings')}>
      <OptionsField
        title={t('web-ui-settings.labels.language')}
        value={language}
        options={languageOptions}
        onChange={setLanguage}
      />

      <OptionsField
        title={t('web-ui-settings.labels.theme')}
        value={theme}
        options={themeOptions}
        onChange={setTheme}
      />

      {authStore.hasRights(UserRole.Operator) && (
        <StringField
          title={t('web-ui-settings.labels.name')}
          description={t('web-ui-settings.labels.name-description')}
          value={description}
          onChange={(val: string) => setDescription(val)}
        />
      )}

      <BooleanField
        title={t('web-ui-settings.labels.show-page-in-title')}
        value={showPageInTitle}
        onChange={setShowPageInTitle}
      />

      <BooleanField
        title={t('web-ui-settings.labels.show-system-devices')}
        value={showSystemDevices}
        onChange={setShowSystemDevices}
      />

      <FormButtonGroup>
        <Button
          label={t('common.buttons.apply')}
          onClick={applyHandler}
        />
      </FormButtonGroup>
    </FormFieldGroup>
  );
});
