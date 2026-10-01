import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AccessPointIcon from '@/assets/icons/acces-point.svg';
import CanIcon from '@/assets/icons/can.svg';
import EthernetIcon from '@/assets/icons/ethernet.svg';
import SignalIcon from '@/assets/icons/signal.svg';
import WarnIcon from '@/assets/icons/warn.svg';
import WifiIcon from '@/assets/icons/wifi.svg';
import { NetworkType } from '@/pages/settings/network-connections/stores/types';
import { type ConnectionItemProps } from './types';
import './styles.css';

export const ConnectionItem = observer(({ connection }: ConnectionItemProps) => {
  const { t } = useTranslation();

  const icon = useMemo(() => {
    const className = 'connectionItem-icon';

    switch (connection.data.type) {
      case NetworkType.Wifi:
        return <WifiIcon className={className} />;
      case NetworkType.Modem:
        return <SignalIcon className={className} />;
      case NetworkType.Ethernet:
        return <EthernetIcon className={className} />;
      case NetworkType.WifiAp:
        return <AccessPointIcon className={className} />;
      case NetworkType.Can:
        return <CanIcon className={className} />;
      default:
        return <WarnIcon className={className} />;
    }
  }, [connection.data.type]);

  return (
    <div className={'connectionItem ' + connection.state}>
      {icon}
      <div>
        {!!connection.name && <b>{connection.name}</b>}
        {!!connection.description && <div>{t(connection.description)}</div>}
        {(connection.operator || connection.signalQuality || connection.accessTechnologies) && (
          <div>{connection.operator} - {connection.signalQuality}% ({connection.accessTechnologies})</div>
        )}
        {!connection.withAutoconnect && <div>{t('network-connections.labels.manual-connect')}</div>}
      </div>
    </div>
  );
});
