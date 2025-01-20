import { useEffect, useState } from 'react';
import { ColorpickerProps } from './types';
import './styles.css';

export const Colorpicker = ({
  value, id, isDisabled, onChange, ariaLabel,
}: ColorpickerProps) => {
  const [proxyVallue, setProxyValue] = useState('#000000');

  useEffect(() => {
    setProxyValue(value || '#000000');
  }, [value]);

  return (
    <input
      type="color"
      className="colorpicker"
      id={id}
      disabled={isDisabled}
      aria-label={ariaLabel}
      value={proxyVallue}
      onChange={(ev) => {
        if (value !== ev.target.value) {
          setProxyValue(ev.target.value);
          onChange(ev.target.value);
        }
      }}
    />
  );
};
