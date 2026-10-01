import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { ControlsBottomSheetMobile } from './controls-bottom-sheet-mobile';
import { gearRest, pickGear } from './gear-cells';
import { GridControlCell } from './grid-control-cell';
import { pinnedControlsLabel } from './pinned-controls-label';
import type { GearControlsMobileProps } from './types';

export const GearControlsMobile = observer((
  { cells, levelReading, isDisabled, peekTitle }: GearControlsMobileProps,
) => {
  const { t } = useTranslation();
  const pinnedControls = pickGear(cells);

  return (
    <ControlsBottomSheetMobile pinnedControls={pinnedControls} levelReading={levelReading} peekTitle={peekTitle}>
      {pinnedControls.map((cell) => (
        <GridControlCell
          key={cell.id}
          cell={cell}
          isDisabled={isDisabled}
          name={pinnedControlsLabel(cell, t)}
          levelReading={levelReading}
        />
      ))}
      {gearRest(cells, pinnedControls).map((cell) => (
        <GridControlCell key={cell.id} cell={cell} isDisabled={isDisabled} />
      ))}
    </ControlsBottomSheetMobile>
  );
});
