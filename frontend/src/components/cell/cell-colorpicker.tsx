import { observer } from 'mobx-react-lite';
import { Colorpicker } from '@/components/colorpicker';
import { CellHistory } from './cell-history';
import { type CellColorpickerProps } from './types';
import './styles.css';

export const CellColorpicker = observer(({ cell, hideHistory }: CellColorpickerProps) => (
  <>
    {!hideHistory && <CellHistory cell={cell} />}

    <Colorpicker
      value={cell.value as string}
      id={cell.id}
      isDisabled={cell.readOnly}
      isInvalid={!!cell.error}
      ariaLabel={cell.name}
      onChange={(value) => cell.value = value}
    />
  </>
));
