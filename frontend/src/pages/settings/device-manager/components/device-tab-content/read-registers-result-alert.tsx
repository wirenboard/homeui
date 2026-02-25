import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { Dropdown, type Option } from '@/components/dropdown';
import { ReadRegistersState, type DeviceTabStore } from '@/stores/device-manager';
import type { ReadRegistersResultAlertProps } from './types';

const DeprecatedAlert = () => {
  const { t } = useTranslation();
  return <Alert variant="warn">{t('device-manager.errors.deprecated')}</Alert>;
};

const UpdatedTemplateAlert = ({
  tab,
  onDeviceTypeChange,
}: {
  tab: DeviceTabStore;
  onDeviceTypeChange: (tab: DeviceTabStore, deviceType: string) => void;
}) => {
  const { t } = useTranslation();
  const [isOpened, setIsOpened] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(tab.readRegistersState.otherMatchingTemplates[0]);
  const templatesOptions = tab.readRegistersState.otherMatchingTemplates.map((deviceType) => ({
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
  const danger = tab.readRegistersState.state === ReadRegistersState.Error;
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
      <Alert variant={danger ? 'danger' : 'info'} className="alert-withButton">
        <span>{danger ? tab.readRegistersState.errorMessage : t('device-manager.labels.better-template')}</span>
        <Button
          label={t('device-manager.buttons.switch-template')}
          variant={danger ? 'danger' : 'primary'}
          onClick={onChangeTemplate}
        />
      </Alert>
    </>
  );
};

const ManualReadAlert = ({
  tab,
  onReadRegisters,
}: {
  tab: DeviceTabStore;
  onReadRegisters: (tab: DeviceTabStore) => void;
}) => {
  const { t } = useTranslation();
  return (
    <Alert variant="info" className="alert-withButton">
      <span>{t('device-manager.labels.read-registers-manual')}</span>
      <Button
        label={t('common.buttons.read')}
        variant="primary"
        onClick={() => onReadRegisters(tab)}
      />
    </Alert>
  );
};

export const ReadRegistersResultAlert = observer(({
  tab,
  onDeviceTypeChange,
  onReadRegisters,
}: ReadRegistersResultAlertProps
) => {
  const { t } = useTranslation();
  switch (tab.readRegistersState.state) {
    case ReadRegistersState.Disabled: {
      return (
        <>
          {tab.isDeprecated && <DeprecatedAlert />}
          <Alert variant="info">{t('device-manager.labels.read-registers-disabled')}</Alert>
        </>
      );
    }
    case ReadRegistersState.Error: {
      if (tab.readRegistersState.otherMatchingTemplates.length) {
        return <UpdatedTemplateAlert tab={tab} onDeviceTypeChange={onDeviceTypeChange} />;
      }
      return (
        <>
          {tab.isDeprecated && <DeprecatedAlert />}
          <Alert variant="danger">{tab.readRegistersState.errorMessage}</Alert>
        </>
      );
    }
    case ReadRegistersState.Manual: {
      return (
        <>
          {tab.isDeprecated && <DeprecatedAlert />}
          <ManualReadAlert tab={tab} onReadRegisters={onReadRegisters} />
        </>
      );
    }
    case ReadRegistersState.Complete: {
      if (tab.readRegistersState.otherMatchingTemplates.length) {
        return <UpdatedTemplateAlert tab={tab} onDeviceTypeChange={onDeviceTypeChange} />;
      }
      if (tab.isDeprecated) {
        return <DeprecatedAlert />;
      }
      return null;
    }
    case ReadRegistersState.WaitFirstRead:
    case ReadRegistersState.Unsupported: {
      if (tab.isDeprecated) {
        return <DeprecatedAlert />;
      }
      return null;
    }
  }
});
