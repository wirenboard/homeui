import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { lazy } from 'react';
import { type EmbeddedSoftware, type DeviceTabStore } from '@/stores/device-manager';
import './styles.css';

const RefreshIcon = lazy(() => import('@/assets/icons/refresh.svg'));
const WarnIcon = lazy(() => import('@/assets/icons/warn.svg'));

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
  const isError =
    tab.hasInvalidConfig || tab.showDisconnectedError || tab.embeddedSoftware.hasError;
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
