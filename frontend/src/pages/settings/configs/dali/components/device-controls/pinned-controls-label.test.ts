// @vitest-environment happy-dom
import { type TFunction } from 'i18next';
import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';
import type Cell from '@/stores/devices/cell';
import { pinnedControlsLabel } from './pinned-controls-label';

const cell = (
  controlId: string,
  name: string,
  type: string,
  { readOnly = false, order = 0, value = null as unknown } = {},
): Cell => ({ id: `dev/${controlId}`, controlId, name, type, readOnly, order, value } as unknown as Cell);

vi.mock('@/services', () => import('@/test/mocks/services'));

const translator = (locale: object) => ((key: string, options?: Record<string, unknown>) => {
  const value = key.split('.').reduce<any>((node, part) => node?.[part], locale);
  if (typeof value !== 'string') {
    return key;
  }
  return Object.entries(options ?? {}).reduce(
    (text, [name, replacement]) => text.replace(`{{${name}}}`, String(replacement)),
    value,
  );
}) as TFunction;

describe('pinnedControlsLabel', () => {
  const t = { en: translator(en), ru: translator(ru) };

  it('names a setpoint slot by its quantity, not by the daemon\'s "wanted" title', () => {
    expect(pinnedControlsLabel(cell('wanted_level', 'Wanted Level', 'range'), t.en)).toBe('Brightness');
    expect(pinnedControlsLabel(cell('wanted_level', 'Желаемая яркость', 'range'), t.ru)).toBe('Яркость');
    expect(pinnedControlsLabel(cell('set_colour_temperature', 'Wanted Colour Temperature', 'range'), t.en))
      .toBe('Colour temperature');
    expect(pinnedControlsLabel(cell('set_rgb', 'Желаемый RGB', 'rgb'), t.ru)).toBe('Цвет');
  });

  it('numbers a primary-colour slot from its control id', () => {
    expect(pinnedControlsLabel(cell('set_primary_n3', 'Wanted Primary N3', 'range'), t.en)).toBe('Primary N3');
    expect(pinnedControlsLabel(cell('set_primary_n3', 'Желаемый основной N3', 'range'), t.ru)).toBe('Основной N3');
  });

  it('leaves a control that is not a setpoint alone', () => {
    expect(pinnedControlsLabel(cell('off', 'Off', 'pushbutton'), t.en)).toBe('Off');
    expect(pinnedControlsLabel(cell('illuminance1', 'Освещённость 1', 'value'), t.ru)).toBe('Освещённость 1');
  });

  it('leaves no "желаемый" anywhere in the pinned controls, whatever the daemon called the pair', () => {
    const setpoints = [
      cell('wanted_level', 'Желаемая яркость', 'range'),
      cell('set_rgb', 'Желаемый RGB', 'rgb'),
      cell('set_white', 'Желаемый W', 'range'),
      cell('set_colour_temperature', 'Желаемая цветовая температура', 'range'),
      cell('set_x_coordinate', 'Желаемая координата X', 'range'),
      cell('set_y_coordinate', 'Желаемая координата Y', 'range'),
      cell('set_primary_n0', 'Желаемый основной N0', 'range'),
    ];
    setpoints.forEach((setpoint) => {
      expect(pinnedControlsLabel(setpoint, t.ru).toLowerCase()).not.toContain('желаем');
      expect(pinnedControlsLabel(setpoint, t.ru)).not.toBe(setpoint.controlId);
    });
  });
});
