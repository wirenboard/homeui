import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { BooleanField, FormButtonGroup, FormFieldGroup, OptionsField } from '@/components/form';
import { dashboardsStore } from '@/stores/dashboards';
import { FontsManager } from './components/fonts-manager';

export const PanelsSettings = observer(() => {
  const { t } = useTranslation();
  const [defaultDashboardId, setDefaultDashboardId] = useState('');
  const [isShowWidgetsPage, setIsShowWidgetsPage] = useState(false);
  const options = dashboardsStore.dashboardsList
    .filter((dashboard) => !dashboard.options.isHidden)
    .map((dashboard) => ({ label: dashboard.name, value: dashboard.id }));

  useEffect(() => {
    setDefaultDashboardId(dashboardsStore.defaultDashboardId ?? '');
    setIsShowWidgetsPage(dashboardsStore.isShowWidgetsPage ?? false);
  }, [dashboardsStore.defaultDashboardId, dashboardsStore.isShowWidgetsPage]);

  const applyHandler = () => {
    dashboardsStore.setDefaultDashboardId(defaultDashboardId);
    dashboardsStore.setIsShowWidgetsPage(isShowWidgetsPage);
  };

  return (
    <FormFieldGroup heading={t('web-ui-settings.labels.panels-settings')}>
      <OptionsField
        title={t('web-ui-settings.labels.default-dashboard')}
        value={defaultDashboardId}
        options={options}
        isDisabled={dashboardsStore.isLoading}
        onChange={setDefaultDashboardId}
      />

      <BooleanField
        title={t('web-ui-settings.labels.show-widgets-page')}
        value={isShowWidgetsPage}
        onChange={setIsShowWidgetsPage}
      />

      <FormButtonGroup>
        <Button
          label={t('common.buttons.apply')}
          onClick={applyHandler}
        />
      </FormButtonGroup>

      <FontsManager />
    </FormFieldGroup>
  );
});
