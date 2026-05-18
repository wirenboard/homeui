import classNames from 'classnames';
import { type FormEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type RangeProps } from './types';
import './styles.css';

export const Range = ({
  value, id, isDisabled, min, max, step, units, formatLabel, isInvalid, onChange, ariaLabel,
  labelPosition = 'bottom',
}: RangeProps) => {
  const [proxyValue, setProxyValue] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const rangeBlockWidth = 70;
  const isRight = labelPosition === 'right';

  const rangeValuePosition = useMemo(() => {
    const range = max - min;
    const relativeValue = proxyValue - min;
    const percent = (relativeValue / range) * 100;
    const thumbWidth = 16;
    return `calc(${percent}% - ${(percent * thumbWidth) / 100}px - ${rangeBlockWidth / 2}px + ${thumbWidth / 2}px)`;
  }, [proxyValue, min, max]);

  useLayoutEffect(() => {
    setProxyValue(value);
  }, [value]);

  const valueLabel = (
    <div
      className={classNames('range-value', { 'range-value-right': isRight })}
    >
      <div
        className={classNames({
          'range-negative': proxyValue < 0,
        })}
        style={isRight ? undefined : {
          position: 'absolute',
          left: rangeValuePosition,
          width: `${rangeBlockWidth}px`,
        }}
      >
        {formatLabel ? formatLabel(proxyValue) : <>{Math.abs(proxyValue)} {units}</>}
      </div>
    </div>
  );

  return (
    <div
      className={classNames('range-container', {
        'range-invalid': isInvalid,
        'range-container-right': isRight,
      })}
    >
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
        onInput={(ev: FormEvent<HTMLInputElement>) => {
          setProxyValue(ev.currentTarget.valueAsNumber);
        }}
        onTouchEnd={() => {
          input.current.focus();
          onChange(proxyValue);
        }}
        onMouseUp={() => onChange(proxyValue)}
      />
      {valueLabel}
    </div>
  );
};
