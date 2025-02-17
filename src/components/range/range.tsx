import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RangeProps } from './types';
import './styles.css';

export const Range = ({
  value, id, isDisabled, min, max, step, units, onChange, ariaLabel,
}: RangeProps) => {
  const [proxyValue, setProxyValue] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const rangeBlockWidth = 150;

  const rangeValuePosition = useMemo(() => {
    const percent = Number(((proxyValue / max) * 100).toFixed());
    const thumbWidth = 16;
    return `calc(${percent}% - ${(percent * thumbWidth) / 100}px - ${rangeBlockWidth / 2}px  + ${thumbWidth / 2}px)`;
  }, [proxyValue, max]);

  useLayoutEffect(() => {
    setProxyValue(value);
  }, [value]);

  return (
    <div className="range-container">
      <input
        ref={input}
        type="range"
        className="range"
        id={id}
        disabled={isDisabled}
        value={proxyValue}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        onKeyUp={() => onChange(proxyValue)}
        onChange={(ev) => {
          setProxyValue(ev.target.valueAsNumber);
          // have to force focus because it's not working on mobile
          input.current.focus();
        }}
        onMouseUp={() => onChange(proxyValue)}
      />
      <div className="range-value">
        <div
          style={{
            position: 'absolute',
            left: rangeValuePosition,
            width: `${rangeBlockWidth}px`,
          }}
        >
          {proxyValue}
          {' '}
          {units}
        </div>
      </div>
    </div>
  );
};
