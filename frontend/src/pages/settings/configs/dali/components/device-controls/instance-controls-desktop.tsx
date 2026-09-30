import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import { useMaxColumns } from '@/components/columns-wrapper';
import { GridControlCell } from './grid-control-cell';
import { instanceGroups } from './instance-cells';
import { PinnedControlsCellDesktop } from './pinned-controls-cell-desktop';
import { ShowAllButton } from './show-all-button';
import type { InstanceControlsDesktopProps } from './types';

const INSTANCE_COLUMN_WIDTH = 255;

const columnStyle = (columns: number) => ({ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` });

export const InstanceControlsDesktop = observer(({ cells, isDisabled, children }: InstanceControlsDesktopProps) => {
  const [showAll, setShowAll] = useState(false);
  const pinnedControlsRef = useRef<HTMLDivElement>(null);
  const groups = instanceGroups(cells);
  const columns = useMaxColumns(pinnedControlsRef, true, INSTANCE_COLUMN_WIDTH);
  const panelColumns = [
    ...groups.slice(0, columns).map((group) => group.slice(1)),
    ...groups.slice(columns),
  ];
  const hasRest = panelColumns.some((column) => column.length > 0);

  return (
    <>
      <div
        ref={pinnedControlsRef}
        className="daliDeviceControls-pinnedControls daliDeviceControls-pinnedControlsColumns"
        style={columnStyle(columns)}
      >
        {groups.slice(0, columns).map(([cell]) => (
          <PinnedControlsCellDesktop key={cell.id} cell={cell} isDisabled={isDisabled} />
        ))}
        <ShowAllButton isExpanded={showAll} isDisabled={!hasRest} onToggle={() => setShowAll(!showAll)} />
      </div>
      <div className="dali-tabBody">
        {showAll && hasRest && (
          <div className="daliDeviceControls daliDeviceControls-instances">
            <div className="daliDeviceControls-instanceGrid" style={columnStyle(columns)}>
              {panelColumns.map((panelCells, index) => (
                <div className="daliDeviceControls-instanceColumn" key={index}>
                  {panelCells.map((cell) => (
                    <GridControlCell key={cell.id} cell={cell} isDisabled={isDisabled} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {children}
      </div>
    </>
  );
});
