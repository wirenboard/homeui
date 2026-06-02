import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { type HeaderButtonsProps } from './types';

const SaveSettingsButton = ({ onClick, disabled, isLoading }) => {
  const { t } = useTranslation();
  return (
    <Button
      label={t('device-manager.buttons.save')}
      disabled={disabled}
      isLoading={isLoading}
      onClick={onClick}
    />
  );
};

const AddDevicesButtonsPanel = ({ allowAddDevice, onAddDevice, onAddWbDevice }) => {
  const { t } = useTranslation();
  return (
    <>
      <Button
        label={t('device-manager.buttons.add-wb-device')}
        disabled={!allowAddDevice}
        onClick={onAddWbDevice}
      />
      <Button
        label={t('device-manager.buttons.add-custom-device')}
        aria-haspopup="dialog"
        variant="secondary"
        disabled={!allowAddDevice}
        onClick={onAddDevice}
      />
    </>
  );
};

export const HeaderButtons = observer(
  ({
    allowSave,
    isSaving,
    allowAddDevice,
    onSave,
    onAddDevice,
    onAddWbDevice,
    mobileModeStore,
  }: HeaderButtonsProps) => {
    const { t } = useTranslation();

    if (mobileModeStore.inMobileMode) {
      if (mobileModeStore.tabsPanelIsActive) {
        return (
          <>
            <SaveSettingsButton disabled={!allowSave} isLoading={isSaving} onClick={onSave} />
            <AddDevicesButtonsPanel
              allowAddDevice={allowAddDevice}
              onAddDevice={onAddDevice}
              onAddWbDevice={onAddWbDevice}
            />
          </>
        );
      }
      return (
        <Button
          variant="secondary"
          label={t('device-manager.buttons.to-port-list')}
          onClick={() => {
            mobileModeStore.showTabsPanel();
          }}
        />
      );
    }
    return (
      <>
        <AddDevicesButtonsPanel
          allowAddDevice={allowAddDevice}
          onAddDevice={onAddDevice}
          onAddWbDevice={onAddWbDevice}
        />
        <SaveSettingsButton disabled={!allowSave} isLoading={isSaving} onClick={onSave} />
      </>
    );
  },
);
