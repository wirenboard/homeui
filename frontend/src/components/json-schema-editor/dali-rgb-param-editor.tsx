import { observer } from 'mobx-react-lite';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Colorpicker } from '@/components/colorpicker';
import { rgbToHex, hexToRgb } from '@/utils/color';
import { ChannelSlider } from './components/channel-slider';
import type { DaliRGBEditorProps } from './types';

const MASK_VALUE = 255;

const parseRGB = (value: string): [number, number, number] => {
  const parts = value.split(';');
  const clamp = (v: number) => Math.min(MASK_VALUE, Math.max(0, v));
  const r = clamp(parseInt(parts[0], 10) || 0);
  const g = clamp(parseInt(parts[1], 10) || 0);
  const b = clamp(parseInt(parts[2], 10) || 0);
  return [r, g, b];
};

const toRGBString = (r: number, g: number, b: number): string => `${r};${g};${b}`;

const DaliRGBEditor = observer(({ store, inputId }: DaliRGBEditorProps) => {
  const colorpickerId = useId();
  const { t } = useTranslation();
  const isDisabled = !!store.schema.options?.wb?.read_only;
  const isInvalid = store.hasErrors;
  const maskLabel = t('json-editor.labels.dali-mask');

  const rawValue = typeof store.value === 'string' ? store.value : '0;0;0';
  const [r, g, b] = parseRGB(rawValue);

  const hexValue = rgbToHex(
    String(r === MASK_VALUE ? 0 : r),
    String(g === MASK_VALUE ? 0 : g),
    String(b === MASK_VALUE ? 0 : b),
  );

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
