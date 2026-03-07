import { useCallback, ChangeEvent, MouseEvent, TouchEvent, KeyboardEvent } from 'react';
import { Switch } from '@/components/switch';

const CHANNEL_MIN = 0;
const CHANNEL_MAX = 254;
const MASK_VALUE = 255;

export interface ChannelSliderProps {
  value: number;
  color: string;
  isDisabled: boolean;
  isInvalid: boolean;
  maskLabel: string;
  onChange: (val: number) => void;
}

export const ChannelSlider = ({ value, color, isDisabled, isInvalid, maskLabel, onChange }: ChannelSliderProps) => {
  const isMasked = value === MASK_VALUE;
  const gradient = `linear-gradient(to right, #000000, ${color})`;

  const onSwitchChange = useCallback((enabled: boolean) => {
    onChange(enabled ? 0 : MASK_VALUE);
  }, [onChange]);

  const onSliderChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.valueAsNumber);
  }, [onChange]);

  const onMouseUp = useCallback((e: MouseEvent<HTMLInputElement>) => {
    onChange((e.target as HTMLInputElement).valueAsNumber);
  }, [onChange]);

  const onTouchEnd = useCallback((e: TouchEvent<HTMLInputElement>) => {
    onChange((e.target as HTMLInputElement).valueAsNumber);
  }, [onChange]);

  const onKeyUp = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    onChange((e.target as HTMLInputElement).valueAsNumber);
  }, [onChange]);

  return (
    <div className="dali-rgb-channel">
      <Switch
        value={!isMasked}
        isDisabled={isDisabled}
        onChange={onSwitchChange}
      />
      {isMasked ? (
        <span className="dali-rgb-channel-mask">{maskLabel}</span>
      ) : (
        <input
          type="range"
          className={`range dali-rgb-channel-slider${isInvalid ? ' dali-rgb-channel-slider-invalid' : ''}`}
          style={{ background: gradient }}
          value={value}
          min={CHANNEL_MIN}
          max={CHANNEL_MAX}
          step={1}
          disabled={isDisabled}
          onKeyUp={onKeyUp}
          onMouseUp={onMouseUp}
          onTouchEnd={onTouchEnd}
          onChange={onSliderChange}
        />
      )}
    </div>
  );
};
