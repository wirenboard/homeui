import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { gearRest, isCommand, pickGear } from './gear-cells';
import { GridControlCell } from './grid-control-cell';
import { PinnedControlsCellDesktop } from './pinned-controls-cell-desktop';
import { ShowAllButton } from './show-all-button';
import type { GearControlsDesktopProps } from './types';

export const GearControlsDesktop = observer((
  { cells, levelReading, isDisabled, children }: GearControlsDesktopProps,
) => {
  const [showAll, setShowAll] = useState(false);
  const pinnedControls = pickGear(cells);
  const rest = gearRest(cells, pinnedControls);

  return (
    <>
      <div className="daliDeviceControls-pinnedControls">
        {pinnedControls.map((cell) => (
          <PinnedControlsCellDesktop key={cell.id} cell={cell} isDisabled={isDisabled} levelReading={levelReading} />
        ))}
        <ShowAllButton isExpanded={showAll} isDisabled={!rest.length} onToggle={() => setShowAll(!showAll)} />
      </div>
      <div className="dali-tabBody">
        {showAll && rest.length > 0 && (
          <div className="daliDeviceControls">
            <div className="daliDeviceControls-rows">
              <div className="daliDeviceControls-flow">
                {rest.filter((cell) => !isCommand(cell)).map((cell) => (
                  <GridControlCell key={cell.id} cell={cell} isDisabled={isDisabled} />
                ))}
              </div>
              <div className="daliDeviceControls-flow">
                {rest.filter(isCommand).map((cell) => (
                  <GridControlCell key={cell.id} cell={cell} isDisabled={isDisabled} />
                ))}
              </div>
            </div>
          </div>
        )}
        {children}
      </div>
    </>
  );
});
