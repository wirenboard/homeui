import {
  CHANNEL_CLASSES, findType, hasUnit, primaryRole, recipeRows, recipeSplit, type NewDeviceRow, type RecipeFit,
  type RoleId, type SerialDevice,
} from '@/stores/configurator';
import { devicesStore, type Cell } from '@/stores/devices';
import type { WbUnit } from './types';
import { classifyCell, controlMeta, defaultName, deviceTitle, recipeRowName } from './utils';

// Заряд батареи каталог относит к роли «батарея», но как числовое показание он тоже годится.
export const fits = (cell: Cell, role: RoleId) => {
  const { cls } = classifyCell(cell);
  return CHANNEL_CLASSES[cls].fits.includes(role) || (role === 'number' && cls === 'battery');
};

// Будущие устройства по рецепту модели; null — рецепта нет.
export const recipeUnits = (
  id: string,
  cells: Cell[],
  used: Set<string>,
  serial: SerialDevice | undefined,
  channelLabel: (_index: number) => string,
): WbUnit[] | null => {
  const isFit: RecipeFit = (controlId, role) => fits(cells.find((cell) => cell.controlId === controlId), role);
  const found = recipeRows(id, cells.map((cell) => cell.controlId), used, isFit, serial);
  if (!found) {
    return null;
  }
  const split = recipeSplit(id, serial);
  const units: WbUnit[] = [];
  found.forEach((item, at) => {
    const cell = cells.find(({ id: cellId }) => cellId === item.row.bind[primaryRole(item.row.type)]);
    // У числового датчика имя и единицы берутся от самого контрола.
    const row: NewDeviceRow = {
      ...item.row,
      name: item.byControl || hasUnit(item.row.type) ? cell.name : recipeRowName(item),
      ...(hasUnit(item.row.type) ? { unit: controlMeta(cell).units } : {}),
    };
    const choices = CHANNEL_CLASSES[classifyCell(cell).cls].types;
    const key = split === 'index' ? `${id}#${item.index}` : `${id}#row${at}`;
    const unit = split && units.find((other) => other.key === key);
    if (unit) {
      unit.rows.push(row);
      unit.choices = [];
    } else if (split || !units.length) {
      const label = split === 'index' ? channelLabel(item.index) : row.name;
      units.push({
        key: split ? key : id,
        name: split ? label : deviceTitle(id),
        label: split ? label : deviceTitle(id),
        rows: [row],
        // Тип можно менять, только пока в строке один канал с несколькими подходящими типами.
        choices: split && choices.includes(row.type) ? choices : [],
        suggest: item.suggest,
      });
    } else {
      units[0].rows.push(row);
    }
  });
  return units;
};

// Строка по каналу с первым подходящим типом.
const plainRow = (cell: Cell, battery?: string): NewDeviceRow => {
  const { cls, units } = classifyCell(cell);
  const [type] = CHANNEL_CLASSES[cls].types;
  const takesBattery = battery && findType(type).roles.some(([role]) => role === 'battery');
  return {
    type,
    name: defaultName(type, cell, cls),
    bind: { [primaryRole(type, cls)]: cell.id, ...(takesBattery ? { battery } : {}) },
    unit: units,
  };
};

// Без рецепта: каждый выход — своё устройство, все датчики — одно общее.
// Один выключатель с каналами уровня считается одной лампой, как у Zigbee.
export const plainUnits = (id: string, cells: Cell[], used: Set<string>): WbUnit[] => {
  const free = cells.filter((cell) => !used.has(cell.id));
  const ofClass = (cls: string) => free.filter((cell) => classifyCell(cell).cls === cls);
  const battery = ofClass('battery')[0]?.id;
  const switches = ofClass('bin_rw');
  const levels = ofClass('level');
  const units: WbUnit[] = [];
  const unit = (key: string, rows: NewDeviceRow[], label: string, choices: string[] = []) => units.push({
    key, name: label, label, rows, choices,
  });
  const taken: string[] = [];

  if (switches.length === 1 && levels.length) {
    const [onOff] = switches;
    const temperature = levels.find((cell) => /temp/i.test(cell.controlId));
    const brightness = levels.find((cell) => cell !== temperature);
    const color = ofClass('color')[0];
    const bind = Object.fromEntries(Object.entries({
      on_off: onOff.id, brightness: brightness?.id, color_temperature: temperature?.id, color: color?.id,
    }).filter(([, key]) => key));
    taken.push(...Object.values(bind));
    unit(`${id}#light`, [{ type: 'light', name: onOff.name, bind }], deviceTitle(id));
  }
  [...switches, ...levels].filter((cell) => !taken.includes(cell.id)).forEach((cell) => {
    taken.push(cell.id);
    unit(`${id}#${cell.controlId}`, [plainRow(cell)], cell.name, CHANNEL_CLASSES[classifyCell(cell).cls].types);
  });
  // Настройки прибора (смещения, таймауты) оконечным оборудованием не являются.
  const sensors = free
    .filter((cell) => !taken.includes(cell.id) && classifyCell(cell).cls !== 'setting'
      && CHANNEL_CLASSES[classifyCell(cell).cls].types.length)
    .map((cell) => plainRow(cell, battery));
  if (sensors.length) {
    const only = sensors.length === 1 && free.find((cell) => cell.id === Object.values(sensors[0].bind)[0]);
    unit(`${id}#sensors`, sensors, deviceTitle(id), only ? CHANNEL_CLASSES[classifyCell(only).cls].types : []);
  }
  // Единственное будущее устройство называется по устройству контроллера.
  return units.length === 1 ? [{ ...units[0], name: deviceTitle(id), label: deviceTitle(id) }] : units;
};

// Строка под выбранный тип: лишние роли отбрасываются, основной канал переходит на основную роль типа.
export const retype = (row: NewDeviceRow, type: string): NewDeviceRow => {
  const roles = findType(type).roles.map(([role]) => role);
  const bind = Object.fromEntries(roles.filter((role) => row.bind[role]).map((role) => [role, row.bind[role]]));
  const main = devicesStore.cells.get(Object.values(row.bind)[0]);
  return {
    ...row,
    type,
    bind: Object.keys(bind).length || !main ? bind : { [primaryRole(type, classifyCell(main).cls)]: main.id },
  };
};
