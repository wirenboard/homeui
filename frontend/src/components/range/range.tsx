import classNames from 'classnames';
import { type FormEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type RangeProps } from './types';
import './styles.css';

export const Range = ({
  value, id, isDisabled, min, max, step, units, isInvalid, onChange, ariaLabel,
}: RangeProps) => {
  const [proxyValue, setProxyValue] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const rangeBlockWidth = 70;

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

  return (
    <div
      className={classNames('range-container', {
        'range-invalid': isInvalid,
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
      <div className="range-value">
        <div
          className={classNames({
            'range-negative': proxyValue < 0,
          })}
          style={{
            position: 'absolute',
            left: rangeValuePosition,
            width: `${rangeBlockWidth}px`,
          }}
        >
          {Math.abs(proxyValue)}
          {' '}
          {units}
        </div>
      </div>
    </div>
  );
};
