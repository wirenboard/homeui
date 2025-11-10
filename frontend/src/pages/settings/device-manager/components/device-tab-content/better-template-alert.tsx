import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { Dropdown, Option } from '@/components/dropdown';
import type { BetterTemplatesAlertProps } from './types';

const DeprecatedAlert = () => {
  const { t } = useTranslation();
  return <Alert variant="warn">{t('device-manager.errors.deprecated')}</Alert>;
};

export const UpdatedTemplateAlert = ({ tab, onDeviceTypeChange }: BetterTemplatesAlertProps) => {
  const { t } = useTranslation();
  const [isOpened, setIsOpened] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(tab.matchingTemplatesStore.matchingTemplates[0]);
  const templatesOptions = tab.matchingTemplatesStore.matchingTemplates.map((deviceType) => ({
    label: tab.deviceTypesStore.getName(deviceType),
    value: deviceType,
  }));
  const onChangeTemplate = () => {
    if (templatesOptions.length === 1) {
      onDeviceTypeChange(tab, templatesOptions[0].value);
      return;
    }
    setIsOpened(true);
  };
  return (
    <>
      {templatesOptions.length > 1 && (
        <Confirm
          isOpened={isOpened}
          heading={t('device-manager.labels.select-template')}
          confirmCallback={() => {
            onDeviceTypeChange(tab, selectedTemplate);
            setIsOpened(false);
          }}
          acceptLabel={t('common.buttons.select')}
          closeCallback={() => setIsOpened(false)}
        >
          <Dropdown
            options={templatesOptions}
            value={selectedTemplate}
            onChange={(option: Option<string>) => setSelectedTemplate(option.value)}
          />
        </Confirm>
      )}
      <Alert variant={tab.matchingTemplatesStore.allowEditSettings ? 'info' : 'danger'} className="alert-withButton">
        <span>
          {t(tab.matchingTemplatesStore.message, {
            currentFw: tab.matchingTemplatesStore.deviceFw,
            requiredFw: tab.matchingTemplatesStore.templateFw,
            deviceModel: tab.matchingTemplatesStore.deviceModel,
          })}
        </span>
        <Button
          label={t('device-manager.buttons.switch-template')}
          variant={tab.matchingTemplatesStore.allowEditSettings ? 'primary' : 'danger'}
          onClick={onChangeTemplate}
        />
      </Alert>
    </>
  );
};

export const BetterTemplatesAlert = ({ tab, onDeviceTypeChange }: BetterTemplatesAlertProps) => {
  if (tab.matchingTemplatesStore.message) {
    return <UpdatedTemplateAlert tab={tab} onDeviceTypeChange={onDeviceTypeChange} />;
  }
  if (tab.isDeprecated) {
    return <DeprecatedAlert />;
  }
  return null;
};
