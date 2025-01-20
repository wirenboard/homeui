import { useLayoutEffect, useState } from 'react';
import { RangeProps } from './types';
import './styles.css';

export const Range = ({
  value, id, isDisabled, min, max, step, units, onChange, ariaLabel,
}: RangeProps) => {
  const [proxyVallue, setProxyValue] = useState(0);
  const rangeBlockWidth = 150;

  const rangeValuePosition = () => {
    const percent = Number(((proxyVallue / max) * 100).toFixed());
    const thumbWidth = 16;
    return `calc(${percent}% - ${(percent * thumbWidth) / 100}px - ${rangeBlockWidth / 2}px  + ${thumbWidth / 2}px)`;
  };

  useLayoutEffect(() => {
    setProxyValue(value);
  }, [value]);

  return (
    <div className="range-container">
      <input
        type="range"
        className="range"
        id={id}
        disabled={isDisabled}
        value={proxyVallue}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        onKeyUp={() => onChange(proxyVallue)}
        onChange={(ev) => setProxyValue(ev.target.valueAsNumber)}
        onMouseUp={() => onChange(proxyVallue)}
      />
      <div className="range-value">
        <div
          style={{
            position: 'absolute',
            left: rangeValuePosition(),
            width: `${rangeBlockWidth}px`,
          }}
        >
          {proxyVallue}
          {' '}
          {units}
        </div>
      </div>
    </div>
  );
};
