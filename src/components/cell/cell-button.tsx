import { observer } from 'mobx-react-lite';
import { Button } from '@/components/button';
import { Cell } from '@/stores/device';
import './styles.css';

export const CellButton = observer(({ cell }: { cell: Cell }) => (
  <Button
    label={cell.name}
    size="small"
    disabled={cell.readOnly}
    onClick={() => cell.value = true}
  />
));
