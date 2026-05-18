import { observer } from 'mobx-react-lite';
import { Button } from '@/components/button';
import { CellHistory } from './cell-history';
import { type CellButtonProps } from './types';
import './styles.css';

export const CellButton = observer(({ cell, name, hideHistory }: CellButtonProps) => (
  <>
    <Button
      label={name || cell.name}
      size="small"
      variant={cell.error ? 'danger' : 'primary'}
      disabled={cell.readOnly}
      onClick={() => cell.value = true}
    />

    {!hideHistory && <CellHistory cell={cell} />}
  </>
));
