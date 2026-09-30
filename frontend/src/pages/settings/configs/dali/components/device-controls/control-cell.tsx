import { observer } from 'mobx-react-lite';
import { Cell as CellContent } from '@/components/cell';
import { LevelCell } from './level-cell';
import { ControlId } from './types';
import type { ControlCellProps } from './types';

export const ControlCell = observer(({ cell, isDisabled, name, levelReading }: ControlCellProps) => (
  cell.controlId === ControlId.WantedLevel && levelReading
    ? <LevelCell cell={cell} reading={levelReading} name={name} isDisabled={isDisabled} />
    : <CellContent cell={cell} name={name} isDisabled={isDisabled} hideHistory={true} hideCopy={true} />
));
