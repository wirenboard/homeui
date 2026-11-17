import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { Cell as CellContent } from '@/components/cell';
import { Tooltip } from '@/components/tooltip';
import { devicesStore } from '@/stores/devices';
import { ControlId } from './types';
import type { GearErrorStatusProps } from './types';
import './styles.css';

export const GearErrorStatus = observer(({ mqttId, isIconOnly }: GearErrorStatusProps) => {
  const status = devicesStore.getDeviceCells(mqttId).find((cell) => cell.controlId === ControlId.ErrorStatus);
  if (!status) {
    return null;
  }
  const content = <CellContent cell={status} hideHistory={true} hideCopy={true} />;
  return (
    <div className={classNames('daliGearErrorStatus', { 'daliGearErrorStatus-iconOnly': isIconOnly })}>
      {isIconOnly ? (
        <Tooltip text={status.name} trigger="click" autoClose={false} placement="bottom-end">
          {content}
        </Tooltip>
      ) : <Tooltip text={status.name}>{content}</Tooltip>}
    </div>
  );
});
