import classNames from 'classnames';
import { useEffect, useState } from 'react';
import { type ColorpickerProps } from './types';
import './styles.css';

export const Colorpicker = ({
  value, id, isDisabled, isInvalid, onChange, ariaLabel,
}: ColorpickerProps) => {
  const [proxyValue, setProxyValue] = useState('#000000');

  useEffect(() => {
    setProxyValue(value || '#000000');
  }, [value]);

  return (
    <input
      type="color"
      className={classNames('colorpicker', {
        'colorpicker-invalid': isInvalid,
      })}
      id={id}
      disabled={isDisabled}
      aria-label={ariaLabel}
      value={proxyValue}
      onChange={(ev) => {
        if (value !== ev.target.value) {
          setProxyValue(ev.target.value);
          onChange(ev.target.value);
        }
      }}
    />
  );
};
