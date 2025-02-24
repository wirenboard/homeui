import { observer } from 'mobx-react-lite';
import { Colorpicker } from '@/components/colorpicker';
import { Cell } from '@/stores/device';
import { CellHistory } from './cell-history';
import './styles.css';

export const CellColorpicker = observer(({ cell }: { cell: Cell }) => (
  <>
    <CellHistory cell={cell} />

    <Colorpicker
      value={cell.value}
      id={cell.id}
      isDisabled={cell.readOnly}
      ariaLabel={cell.name}
      onChange={(value) => cell.value = value}
    />
  </>
));
