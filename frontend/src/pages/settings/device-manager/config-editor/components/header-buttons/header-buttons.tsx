import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Dropdown, type Option } from '@/components/dropdown';
import { type HeaderButtonsProps } from './types';
import './styles.css';

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

type AddMenuAction = 'port' | 'wb-device' | 'custom-device';

const AddMenu = ({ allowAddDevice, isSaving, onAddDevice, onAddWbDevice, onAddPort }) => {
  const { t } = useTranslation();
  const options: Option<AddMenuAction>[] = [
    ...(allowAddDevice
      ? [
        { label: t('device-manager.buttons.add-wb-device'), value: 'wb-device' as const },
        { label: t('device-manager.buttons.add-custom-device'), value: 'custom-device' as const },
      ]
      : []),
    { label: t('device-manager.buttons.add-port'), value: 'port' },
  ];

  return (
    <Dropdown
      className="deviceManagerAddMenu"
      value={null}
      options={options}
      placeholder={t('device-manager.buttons.add')}
      ariaLabel={t('device-manager.buttons.add')}
      isDisabled={isSaving}
      isButton
      onChange={(option: Option<AddMenuAction>) => {
        switch (option?.value) {
          case 'port':
            onAddPort();
            break;
          case 'wb-device':
            onAddWbDevice();
            break;
          case 'custom-device':
            onAddDevice();
            break;
        }
      }}
    />
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
    onAddPort,
    mobileModeStore,
  }: HeaderButtonsProps) => {
    const { t } = useTranslation();

    if (mobileModeStore.inMobileMode) {
      if (mobileModeStore.tabsPanelIsActive) {
        return (
          <>
            <AddMenu
              isSaving={isSaving}
              allowAddDevice={allowAddDevice}
              onAddDevice={onAddDevice}
              onAddWbDevice={onAddWbDevice}
              onAddPort={onAddPort}
            />
            <SaveSettingsButton disabled={!allowSave} isLoading={isSaving} onClick={onSave} />
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
        <AddMenu
          allowAddDevice={allowAddDevice}
          isSaving={isSaving}
          onAddDevice={onAddDevice}
          onAddWbDevice={onAddWbDevice}
          onAddPort={onAddPort}
        />
        <SaveSettingsButton disabled={!allowSave} isLoading={isSaving} onClick={onSave} />
      </>
    );
  },
);
