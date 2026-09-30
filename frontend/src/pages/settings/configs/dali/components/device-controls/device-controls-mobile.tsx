import { observer } from 'mobx-react-lite';
import { deviceCells } from './device-cells';
import { GearControlsMobile } from './gear-controls-mobile';
import { InstanceControlsMobile } from './instance-controls-mobile';
import type { DeviceControlsMobileProps } from './types';

export const DeviceControlsMobile = observer(({ mqttId, isDisabled = false, peekTitle }: DeviceControlsMobileProps) => {
  const { cells, levelReading, isGear } = deviceCells(mqttId);

  if (!cells.length) {
    return null;
  }

  return isGear ? (
    <GearControlsMobile cells={cells} levelReading={levelReading} isDisabled={isDisabled} peekTitle={peekTitle} />
  ) : (
    <InstanceControlsMobile cells={cells} isDisabled={isDisabled} peekTitle={peekTitle} />
  );
});
