import { observer } from 'mobx-react-lite';
import { Colorpicker } from '@/components/colorpicker';
import { CellHistory } from './cell-history';
import { type CellColorpickerProps } from './types';
import './styles.css';

export const CellColorpicker = observer(({ cell, isReadOnly, isDisabled, hideHistory }: CellColorpickerProps) => (
  <>
    {!hideHistory && <CellHistory cell={cell} />}

    <Colorpicker
      value={cell.value as string}
      id={cell.id}
      isDisabled={cell.readOnly || isReadOnly || isDisabled}
      isInvalid={!!cell.error}
      ariaLabel={cell.name}
      onChange={(value) => cell.value = value}
    />
  </>
));
