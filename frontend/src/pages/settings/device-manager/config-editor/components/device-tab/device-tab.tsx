import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import DisconnectedIcon from '@/assets/icons/disconnected.svg';
import RefreshIcon from '@/assets/icons/refresh.svg';
import WarnIcon from '@/assets/icons/warn.svg';
import { Tooltip } from '@/components/tooltip';
import { type EmbeddedSoftware, type DeviceTabStore } from '@/stores/device-manager';
import './styles.css';

const EmbeddedSoftwareUpdateIcon = observer(({ embeddedSoftware }: { embeddedSoftware: EmbeddedSoftware }) => {
  const { t } = useTranslation();

  if (embeddedSoftware.isUpdating) {
    return <RefreshIcon className="deviceTab-updateIcon deviceTab-updateIconAnimationRotate" />;
  }
  if (embeddedSoftware.hasUpdate) {
    return (
      <Tooltip text={t('device-manager.labels.has-firmware-updates')}>
        <RefreshIcon className="deviceTab-updateIcon" />
      </Tooltip>
    );
  }
  return null;
});

export const DeviceTab = observer(({ tab }: { tab: DeviceTabStore }) => {
  const { t } = useTranslation();
  const isDisconnected = tab.isDisconnected && !tab.embeddedSoftware.isUpdating;
  const isError =
    tab.hasInvalidConfig || isDisconnected || tab.embeddedSoftware.hasError;
  const isWarning = tab.isDeprecated || tab.withSubdevices;
  const showSign = isError || isWarning;

  return (
    <div
      className={classNames('deviceTab', {
        'deviceTab-withError': isError,
        'deviceTab-withWarning': isWarning && !isError,
      })}
    >
      <span className="deviceTab-title">{tab.name}</span>
      {tab.initialData.enabled === false ? (
        <Tooltip text={t('device-manager.labels.not-polled')}>
          <DisconnectedIcon className="deviceTab-disconnectedIcon" />
        </Tooltip>
      ) : (
        <>
          <EmbeddedSoftwareUpdateIcon embeddedSoftware={tab.embeddedSoftware} />
          {showSign && <WarnIcon className="deviceTab-warnIcon" />}
        </>
      )}
    </div>
  );
});
