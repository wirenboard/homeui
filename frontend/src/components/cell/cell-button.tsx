import { observer } from 'mobx-react-lite';
import { Button } from '@/components/button';
import { Cell } from '@/stores/device';
import { CellHistory } from './cell-history';
import './styles.css';

export const CellButton = observer(({ cell, name }: { cell: Cell; name?: string }) => (
  <>
    <Button
      label={name || cell.name}
      size="small"
      disabled={cell.readOnly}
      onClick={() => cell.value = true}
    />

    <CellHistory cell={cell} />
  </>
));
