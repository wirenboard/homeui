import { observer } from 'mobx-react-lite';
import { Range } from '@/components/range';
import type { LevelCellProps } from './types';
import './styles.css';

export const LevelCell = observer(({ cell, reading, name, isDisabled }: LevelCellProps) => {
  const measured = reading.value === null || reading.value === undefined ? '—' : `${reading.value} %`;

  return (
    <div className="deviceCell deviceCell-columns">
      <div className="deviceCell-name deviceCell-noClick">
        <span className="deviceCell-nameText">{name || cell.name}</span>
      </div>
      <Range
        id={cell.id}
        value={cell.value as number}
        min={cell.min}
        max={cell.max}
        step={cell.step}
        units="%"
        isDisabled={cell.readOnly || isDisabled}
        isInvalid={!!cell.error}
        ariaLabel={cell.name}
        formatLabel={(value) => `${value} % (${measured})`}
        onChange={(value) => cell.value = value}
      />
    </div>
  );
});
