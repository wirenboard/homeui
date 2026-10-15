import { observer } from 'mobx-react-lite';
import { deviceCells } from './device-cells';
import { GearControlsDesktop } from './gear-controls-desktop';
import { InstanceControlsDesktop } from './instance-controls-desktop';
import type { DeviceControlsDesktopProps } from './types';
import './styles.css';

// The pinned controls stay put, the list it opens scrolls away with `children`, the part of the tab below it.
export const DeviceControlsDesktop = observer((
  { mqttId, isDisabled = false, children }: DeviceControlsDesktopProps,
) => {
  const { cells, levelReading, isGear } = deviceCells(mqttId);

  if (!cells.length) {
    return <div className="dali-tabBody">{children}</div>;
  }

  return isGear ? (
    <GearControlsDesktop cells={cells} levelReading={levelReading} isDisabled={isDisabled}>
      {children}
    </GearControlsDesktop>
  ) : (
    <InstanceControlsDesktop cells={cells} isDisabled={isDisabled}>{children}</InstanceControlsDesktop>
  );
});
