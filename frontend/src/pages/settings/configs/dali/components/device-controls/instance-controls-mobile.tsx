import { observer } from 'mobx-react-lite';
import { ControlsBottomSheetMobile } from './controls-bottom-sheet-mobile';
import { GridControlCell } from './grid-control-cell';
import { instanceGroups } from './instance-cells';
import type { InstanceControlsMobileProps } from './types';

export const InstanceControlsMobile = observer(({ cells, isDisabled, peekTitle }: InstanceControlsMobileProps) => {
  const groups = instanceGroups(cells);

  return (
    <ControlsBottomSheetMobile pinnedControls={groups.map(([cell]) => cell)} peekTitle={peekTitle}>
      {groups.flat().map((cell) => (
        <GridControlCell key={cell.id} cell={cell} isDisabled={isDisabled} />
      ))}
    </ControlsBottomSheetMobile>
  );
});
