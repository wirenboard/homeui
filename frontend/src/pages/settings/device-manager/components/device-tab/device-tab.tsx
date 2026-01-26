import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { type EmbeddedSoftware, type DeviceTabStore } from '@/stores/device-manager';
import './styles.css';

const EmbeddedSoftwareUpdateIcon = observer(({ embeddedSoftware }: { embeddedSoftware: EmbeddedSoftware }) => {
  if (embeddedSoftware.isUpdating) {
    return <i className="glyphicon glyphicon-refresh deviceTab-updateIconAnimationRotate"></i>;
  }
  if (embeddedSoftware.hasUpdate) {
    return <i className="glyphicon glyphicon-refresh"></i>;
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
      {showSign && <i className="glyphicon glyphicon-exclamation-sign"></i>}
    </div>
  );
});
