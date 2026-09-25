import { observer } from 'mobx-react-lite';
import { ControlCell } from './control-cell';
import type { ControlCellProps } from './types';

export const GridControlCell = observer((props: ControlCellProps) => (
  <div className="daliDeviceControls-cell">
    <ControlCell {...props} />
  </div>
));
