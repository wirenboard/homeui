import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { Dropdown, type Option } from '@/components/dropdown';
import { NetworkType } from '../../stores/types';
import { type CreateConnectionModalProps } from './types';

export const CreateConnectionModal = ({ isOpened, onClose, onCreate }: CreateConnectionModalProps) => {
  const { t } = useTranslation();
  const options = [
    { label: t('network-connections.labels.ethernet'), value: NetworkType.Ethernet },
    { label: t('network-connections.labels.wifi'), value: NetworkType.Wifi },
    { label: t('network-connections.labels.modem'), value: NetworkType.Modem },
    { label: t('network-connections.labels.canbus'), value: NetworkType.Can },
    { label: t('network-connections.labels.wifi-ap'), value: NetworkType.WifiAp },
  ];
  const [connection, setConnection] = useState(options.at(0).value);

  return (
    <Confirm
      isOpened={isOpened}
      heading={t('network-connections.labels.select-type')}
      acceptLabel={t('network-connections.buttons.add')}
      isDisabled={!connection}
      closeCallback={onClose}
      confirmCallback={() => {
        onCreate(connection);
        onClose();
      }}
    >
      <Dropdown
        value={connection}
        options={options}
        isSearchable
        onChange={({ value }: Option<NetworkType>) => setConnection(value)}
      />
    </Confirm>
  );
};
