import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Range } from '@/components/range';
import { type CellRangeProps } from './types';
import './styles.css';

export const CellRange = observer(({ cell }: CellRangeProps) => {
  const { t } = useTranslation();

  return (
    <Range
      value={cell.value as number}
      id={cell.id}
      min={cell.min}
      max={cell.max}
      step={cell.step}
      isDisabled={cell.readOnly}
      isInvalid={!!cell.error}
      ariaLabel={cell.name}
      units={t(`units.${cell.units}`, cell.units)}
      onChange={(value) => cell.value = value}
    />
  );
});
