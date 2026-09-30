import { observer } from 'mobx-react-lite';
import { Cell as CellContent } from '@/components/cell';
import { devicesStore } from '@/stores/devices';
import { ControlId } from './types';
import type { GearErrorStatusProps } from './types';
import './styles.css';

export const GearErrorStatus = observer(({ mqttId }: GearErrorStatusProps) => {
  const status = devicesStore.getDeviceCells(mqttId).find((cell) => cell.controlId === ControlId.ErrorStatus);
  if (!status) {
    return null;
  }
  return (
    <div className="daliGearErrorStatus">
      <CellContent cell={status} hideHistory={true} hideCopy={true} />
    </div>
  );
});
