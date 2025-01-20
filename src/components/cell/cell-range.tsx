import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Range } from '@/components/range';
import { Cell } from '@/stores/device';
import './styles.css';

export const CellRange = observer(({ cell }: { cell: Cell }) => {
  const { t } = useTranslation();

  return (
    <Range
      value={cell.value}
      id={cell.id}
      min={cell.min}
      max={cell.max}
      step={cell.step}
      isDisabled={cell.readOnly}
      ariaLabel={cell.name}
      units={t(`units.${cell.units}`, cell.units)}
      onChange={(value) => cell.value = value}
    />
  );
});
