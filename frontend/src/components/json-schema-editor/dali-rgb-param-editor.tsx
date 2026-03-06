import { observer } from 'mobx-react-lite';
import { useCallback, useId } from 'react';
import { Colorpicker } from '@/components/colorpicker';
import { rgbToHex, hexToRgb } from '@/utils/color';
import type { DaliRGBEditorProps } from './types';

const CHANNEL_MIN = 0;
const CHANNEL_MAX = 255;

const parseRGB = (value: string): [number, number, number] => {
  const parts = value.split(';');
  const r = Math.min(CHANNEL_MAX, Math.max(CHANNEL_MIN, parseInt(parts[0], 10) || 0));
  const g = Math.min(CHANNEL_MAX, Math.max(CHANNEL_MIN, parseInt(parts[1], 10) || 0));
  const b = Math.min(CHANNEL_MAX, Math.max(CHANNEL_MIN, parseInt(parts[2], 10) || 0));
  return [r, g, b];
};

const toRGBString = (r: number, g: number, b: number): string => `${r};${g};${b}`;

interface ChannelSliderProps {
  value: number;
  color: string;
  isDisabled: boolean;
  isInvalid: boolean;
  onChange: (val: number) => void;
}

const ChannelSlider = ({ value, color, isDisabled, isInvalid, onChange }: ChannelSliderProps) => {
  const gradient = `linear-gradient(to right, #000000, ${color})`;
  return (
    <input
      type="range"
      className={`range dali-rgb-channel-slider${isInvalid ? ' dali-rgb-channel-slider-invalid' : ''}`}
      style={{ background: gradient }}
      value={value}
      min={CHANNEL_MIN}
      max={CHANNEL_MAX}
      step={1}
      disabled={isDisabled}
      onKeyUp={(e) => onChange((e.target as HTMLInputElement).valueAsNumber)}
      onInput={(e) => (e.target as HTMLInputElement).valueAsNumber}
      onMouseUp={(e) => onChange((e.target as HTMLInputElement).valueAsNumber)}
      onTouchEnd={(e) => onChange((e.target as HTMLInputElement).valueAsNumber)}
      onChange={(e) => onChange(e.target.valueAsNumber)}
    />
  );
};

const DaliRGBEditor = observer(({ store, inputId }: DaliRGBEditorProps) => {
  const colorpickerId = useId();
  const isDisabled = !!store.schema.options?.wb?.read_only;
  const isInvalid = store.hasErrors;

  const rawValue = typeof store.value === 'string' ? store.value : '0;0;0';
  const [r, g, b] = parseRGB(rawValue);

  const hexValue = rgbToHex(String(r), String(g), String(b));

  const onColorChange = useCallback((hex: string) => {
    store.setValue(hexToRgb(hex));
  }, [store]);

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
      <Colorpicker
        id={colorpickerId}
        value={hexValue}
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        onChange={onColorChange}
      />
      <div className="dali-rgb-editor-sliders">
        <ChannelSlider value={r} color={`rgb(255, 0, 0)`} isDisabled={isDisabled} isInvalid={isInvalid} onChange={onRChange} />
        <ChannelSlider value={g} color={`rgb(0, 255, 0)`} isDisabled={isDisabled} isInvalid={isInvalid} onChange={onGChange} />
        <ChannelSlider value={b} color={`rgb(0, 0, 255)`} isDisabled={isDisabled} isInvalid={isInvalid} onChange={onBChange} />
      </div>
    </div>
  );
});

export default DaliRGBEditor;
