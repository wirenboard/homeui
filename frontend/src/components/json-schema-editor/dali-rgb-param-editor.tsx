import { observer } from 'mobx-react-lite';
import { useCallback, useId } from 'react';
import { Colorpicker } from '@/components/colorpicker';
import { Range } from '@/components/range';
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

const formatR = (v: number): string => `R: ${v}`;
const formatG = (v: number): string => `G: ${v}`;
const formatB = (v: number): string => `B: ${v}`;

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
    <div className="dali-rgb-editor">
      <Colorpicker
        id={colorpickerId}
        value={hexValue}
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        onChange={onColorChange}
      />
      <div className="dali-rgb-editor-sliders">
        <div className="dali-rgb-editor-row">
          <Range
            id={inputId ?? ''}
            value={r}
            min={CHANNEL_MIN}
            max={CHANNEL_MAX}
            step={1}
            isDisabled={isDisabled}
            isInvalid={isInvalid}
            labelPosition="right"
            formatLabel={formatR}
            onChange={onRChange}
          />
        </div>
        <div className="dali-rgb-editor-row">
          <Range
            id=""
            value={g}
            min={CHANNEL_MIN}
            max={CHANNEL_MAX}
            step={1}
            isDisabled={isDisabled}
            isInvalid={isInvalid}
            labelPosition="right"
            formatLabel={formatG}
            onChange={onGChange}
          />
        </div>
        <div className="dali-rgb-editor-row">
          <Range
            id=""
            value={b}
            min={CHANNEL_MIN}
            max={CHANNEL_MAX}
            step={1}
            isDisabled={isDisabled}
            isInvalid={isInvalid}
            labelPosition="right"
            formatLabel={formatB}
            onChange={onBChange}
          />
        </div>
      </div>
    </div>
  );
});

export default DaliRGBEditor;
