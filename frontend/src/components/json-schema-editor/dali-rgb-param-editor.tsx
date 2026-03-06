import { observer } from 'mobx-react-lite';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Colorpicker } from '@/components/colorpicker';
import { Switch } from '@/components/switch';
import { rgbToHex, hexToRgb } from '@/utils/color';
import type { DaliRGBEditorProps } from './types';

const CHANNEL_MIN = 0;
const CHANNEL_MAX = 254;
const MASK_VALUE = 255;

const parseRGB = (value: string): [number, number, number] => {
  const parts = value.split(';');
  const clamp = (v: number) => Math.min(MASK_VALUE, Math.max(CHANNEL_MIN, v));
  const r = clamp(parseInt(parts[0], 10) || 0);
  const g = clamp(parseInt(parts[1], 10) || 0);
  const b = clamp(parseInt(parts[2], 10) || 0);
  return [r, g, b];
};

const toRGBString = (r: number, g: number, b: number): string => `${r};${g};${b}`;

// For colorpicker, clamp masked channels to 0
const toHexChannel = (v: number): number => (v === MASK_VALUE ? 0 : v);

interface ChannelSliderProps {
  value: number;
  color: string;
  isDisabled: boolean;
  isInvalid: boolean;
  maskLabel: string;
  onChange: (val: number) => void;
}

const ChannelSlider = ({ value, color, isDisabled, isInvalid, maskLabel, onChange }: ChannelSliderProps) => {
  const isMasked = value === MASK_VALUE;
  const gradient = `linear-gradient(to right, #000000, ${color})`;

  const onSwitchChange = useCallback((enabled: boolean) => {
    onChange(enabled ? 0 : MASK_VALUE);
  }, [onChange]);

  const onSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.valueAsNumber);
  }, [onChange]);

  const onMouseUp = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    onChange((e.target as HTMLInputElement).valueAsNumber);
  }, [onChange]);

  const onTouchEnd = useCallback((e: React.TouchEvent<HTMLInputElement>) => {
    onChange((e.target as HTMLInputElement).valueAsNumber);
  }, [onChange]);

  const onKeyUp = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
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

const DaliRGBEditor = observer(({ store, inputId }: DaliRGBEditorProps) => {
  const colorpickerId = useId();
  const { t } = useTranslation();
  const isDisabled = !!store.schema.options?.wb?.read_only;
  const isInvalid = store.hasErrors;
  const maskLabel = t('json-editor.labels.dali-mask');

  const rawValue = typeof store.value === 'string' ? store.value : '0;0;0';
  const [r, g, b] = parseRGB(rawValue);

  const hexValue = rgbToHex(
    String(toHexChannel(r)),
    String(toHexChannel(g)),
    String(toHexChannel(b))
  );

  const onColorChange = useCallback((hex: string) => {
    // Only update non-masked channels
    const [nr, ng, nb] = hexToRgb(hex).split(';');
    store.setValue(toRGBString(
      r === MASK_VALUE ? MASK_VALUE : parseInt(nr, 10),
      g === MASK_VALUE ? MASK_VALUE : parseInt(ng, 10),
      b === MASK_VALUE ? MASK_VALUE : parseInt(nb, 10),
    ));
  }, [store, r, g, b]);

  const onRChange = useCallback((val: number) => {
    store.setValue(toRGBString(val, g, b));
  }, [store, g, b]);

  const onGChange = useCallback((val: number) => {
    store.setValue(toRGBString(r, val, b));
  }, [store, r, b]);

  const onBChange = useCallback((val: number) => {
    store.setValue(toRGBString(r, g, val));
  }, [store, r, g]);

  return (
    <div className="dali-rgb-editor" id={inputId}>
      <div className="dali-rgb-editor-sliders">
        <ChannelSlider value={r} color="rgb(255, 0, 0)" isDisabled={isDisabled} isInvalid={isInvalid} maskLabel={maskLabel} onChange={onRChange} />
        <ChannelSlider value={g} color="rgb(0, 255, 0)" isDisabled={isDisabled} isInvalid={isInvalid} maskLabel={maskLabel} onChange={onGChange} />
        <ChannelSlider value={b} color="rgb(0, 0, 255)" isDisabled={isDisabled} isInvalid={isInvalid} maskLabel={maskLabel} onChange={onBChange} />
      </div>
      <Colorpicker
        id={colorpickerId}
        value={hexValue}
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        onChange={onColorChange}
      />
    </div>
  );
});

export default DaliRGBEditor;
