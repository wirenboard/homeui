import { observer } from 'mobx-react-lite';
import { Switch } from '@/components/switch';
import { Cell } from '@/stores/device';
import './styles.css';

export const CellSwitch = observer(({ cell }: { cell: Cell }) => (
  <Switch
    value={cell.value}
    id={cell.id}
    isDisabled={cell.readOnly}
    ariaLabel={cell.name}
    onChange={(value) => cell.value = value}
  />
));
