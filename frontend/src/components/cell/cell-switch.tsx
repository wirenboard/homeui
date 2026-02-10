import { observer } from 'mobx-react-lite';
import { Switch } from '@/components/switch';
import { CellHistory } from './cell-history';
import { type CellSwitchProps } from './types';
import './styles.css';

export const CellSwitch = observer(({ cell, inverted, hideHistory }: CellSwitchProps) => (
  <>
    {!hideHistory && <CellHistory cell={cell} />}

    <Switch
      value={inverted ? !cell.value : cell.value as boolean}
      id={cell.id}
      isDisabled={cell.readOnly}
      ariaLabel={cell.name}
      isInvalid={!!cell.error}
      onChange={(value) => cell.value = inverted ? !value : value}
    />
  </>
));
