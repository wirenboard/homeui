import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import RefreshIcon from '@/assets/icons/refresh.svg';
import WarnIcon from '@/assets/icons/warn.svg';
import { type EmbeddedSoftware, type DeviceTabStore } from '@/stores/device-manager';
import './styles.css';

const EmbeddedSoftwareUpdateIcon = observer(({ embeddedSoftware }: { embeddedSoftware: EmbeddedSoftware }) => {
  if (embeddedSoftware.isUpdating) {
    return <RefreshIcon className="deviceTab-updateIcon deviceTab-updateIconAnimationRotate" />;
  }
  if (embeddedSoftware.hasUpdate) {
    return <RefreshIcon className="deviceTab-updateIcon" />;
  }
  return null;
});

export const DeviceTab = observer(({ tab }: { tab: DeviceTabStore }) => {
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
      <EmbeddedSoftwareUpdateIcon embeddedSoftware={tab.embeddedSoftware} />
      {showSign && <WarnIcon className="deviceTab-warnIcon" />}
    </div>
  );
});
