import classNames from 'classnames';
import { type InputEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type RangeProps } from './types';
import './styles.css';

export const Range = ({
  value, id, isDisabled, min, max, step, units, formatLabel, isInvalid, onChange, onLiveChange, ariaLabel,
  labelPosition = 'bottom',
}: RangeProps) => {
  const [proxyValue, setProxyValue] = useState(value);
  const [labelWidth, setLabelWidth] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const isRight = labelPosition === 'right';
  const showLabel = labelPosition !== 'none';

  // Clamped to the track so a long label does not hang off the slider.
  const rangeValuePosition = useMemo(() => {
    const range = (max ?? 100) - (min ?? 0);
    const relativeValue = proxyValue - (min ?? 0);
    const percent = range ? (relativeValue / range) * 100 : 0;
    const thumbWidth = 16;
    const thumbCentre = `${percent}% - ${(percent * thumbWidth) / 100}px + ${thumbWidth / 2}px`;
    return `clamp(0px, calc(${thumbCentre} - ${labelWidth / 2}px), calc(100% - ${labelWidth}px))`;
  }, [proxyValue, min, max, labelWidth]);

  useLayoutEffect(() => {
    setProxyValue(value);
  }, [value]);

  // No deps: the label width follows its text on every render.
  useLayoutEffect(() => {
    if (isRight) {
      return;
    }
    const width = label.current?.offsetWidth ?? 0;
    if (width !== labelWidth) {
      setLabelWidth(width);
    }
  });

  const valueLabel = (
    <div
      className={classNames('range-value', { 'range-value-right': isRight })}
    >
      <div
        ref={label}
        className={classNames({
          'range-negative': proxyValue < 0,
        })}
        style={isRight ? undefined : {
          position: 'absolute',
          left: rangeValuePosition,
          width: 'max-content',
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
        onInput={(ev: InputEvent<HTMLInputElement>) => {
          const next = ev.currentTarget.valueAsNumber;
          setProxyValue(next);
          onLiveChange?.(next);
        }}
        onTouchEnd={() => {
          input.current.focus();
          onChange(proxyValue);
        }}
        onMouseUp={() => onChange(proxyValue)}
      />
      {showLabel && valueLabel}
    </div>
  );
};
