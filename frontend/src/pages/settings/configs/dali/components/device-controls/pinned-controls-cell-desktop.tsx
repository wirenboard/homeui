import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/tooltip';
import { ControlCell } from './control-cell';
import { isSelfLabelled, pinnedControlsLabel } from './pinned-controls-label';
import { ControlId } from './types';
import type { PinnedControlsCellDesktopProps } from './types';

export const PinnedControlsCellDesktop = observer((
  { cell, isDisabled, levelReading }: PinnedControlsCellDesktopProps,
) => {
  const { t } = useTranslation();
  const label = pinnedControlsLabel(cell, t);
  const control = <ControlCell cell={cell} isDisabled={isDisabled} levelReading={levelReading} />;

  return (
    <div className="daliDeviceControls-pinnedControlsCell">
      <span className="daliDeviceControls-pinnedControlsLabel">
        {isSelfLabelled(cell) ? '' : label}
      </span>
      <div className="daliDeviceControls-pinnedControlsCellBody">
        {cell.controlId === ControlId.OnOff
          ? <Tooltip text={label}>{control}</Tooltip>
          : control}
      </div>
    </div>
  );
});
