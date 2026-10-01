import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { PortTab } from '../../stores/port-tab-store';
import { type DeleteModalProps } from './types';

export const DeleteModal = ({ isOpened, selectedTab, onDelete, onClose }: DeleteModalProps) => {
  const { t } = useTranslation();

  return (
    <Confirm
      isOpened={isOpened}
      variant="danger"
      width={600}
      heading={t('device-manager.labels.delete-title')}
      acceptLabel={t('device-manager.buttons.delete')}
      confirmCallback={() => onDelete(true)}
      closeCallback={() => onClose()}
    >
      {selectedTab instanceof PortTab
        ? t('device-manager.labels.confirm-delete-port-devices', {
          item: selectedTab?.name, interpolation: {
            escapeValue: false,
          },
        })
        : t('device-manager.labels.confirm-delete', { item: selectedTab?.name, interpolation: { escapeValue: false } })
      }
    </Confirm>
  );
};
