import { observer } from 'mobx-react-lite';
import { Switch } from '@/components/switch';
import { Cell } from '@/stores/device';
import { CellHistory } from './cell-history';
import './styles.css';

export const CellSwitch = observer(({ cell, inverted }: { cell: Cell; inverted?: boolean }) => (
  <>
    <CellHistory cell={cell} />

    <Switch
      value={inverted ? !cell.value : cell.value as boolean}
      id={cell.id}
      isDisabled={cell.readOnly}
      ariaLabel={cell.name}
      onChange={(value) => cell.value = inverted ? !value : value}
    />
  </>
));
