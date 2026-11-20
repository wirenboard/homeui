import { findType } from './catalog';
import type { NewDeviceRow, RecipeRow, RoleId, WbRecipe } from './types';

// Готовые наборы каналов по моделям WB; {n} в имени контрола — номер канала от 1 до repeat.
// Сюда попадают только модели без режимов: набор их контролов не зависит от настроек.
const RECIPES: WbRecipe[] = [
  {
    models: ['wb-msw-v4'],
    channels: [
      { type: 'temperature_sensor', bind: { temperature: 'Temperature' } },
      { type: 'humidity_sensor', bind: { humidity: 'Humidity' } },
      { type: 'co2_sensor', bind: { co2: 'CO2' } },
      { type: 'illuminance_sensor', bind: { illuminance: 'Illuminance' } },
    ],
  },
  {
    models: ['wb-ms-thls-v2'],
    channels: [
      { type: 'temperature_sensor', bind: { temperature: 'Temperature' } },
      { type: 'humidity_sensor', bind: { humidity: 'Humidity' } },
      { type: 'illuminance_sensor', bind: { illuminance: 'Illuminance' } },
    ],
  },
  { models: ['wb-mrps6', 'wb-mr6lv'], repeat: 6, channels: [{ type: 'switch', bind: { on_off: 'K{n}' } }] },
  {
    models: ['wb-mdm3'],
    repeat: 3,
    channels: [{ type: 'light', bind: { on_off: 'K{n}', brightness: 'Channel {n}' } }],
  },
];

// Идентификатор устройства WB по Modbus: модель и адрес через подчёркивание.
const findRecipe = (deviceId: string) => {
  const model = /^(.+)_\d+$/.exec(deviceId)?.[1];
  return RECIPES.find((recipe) => recipe.models.includes(model));
};

// Строки по рецепту модели; null — рецепта нет. Берутся только существующие и свободные контролы,
// канал без контрола обязательной роли пропускается.
export const recipeRows = (deviceId: string, controlIds: string[], used: Set<string>): RecipeRow[] | null => {
  const recipe = findRecipe(deviceId);
  if (!recipe) {
    return null;
  }
  const isFree = (controlId: string) => controlIds.includes(controlId) && !used.has(`${deviceId}/${controlId}`);
  const rows: RecipeRow[] = [];

  for (let index = 1; index <= (recipe.repeat ?? 1); index += 1) {
    recipe.channels.forEach(({ type, bind }) => {
      const row: NewDeviceRow = { type, name: '', bind: {} };
      const roles = findType(type).roles;
      const isComplete = roles.every(([role, isRequired]) => {
        const controlId = bind[role]?.replace('{n}', String(index));
        if (controlId && isFree(controlId)) {
          row.bind[role as RoleId] = `${deviceId}/${controlId}`;
          return true;
        }
        return !isRequired;
      });
      if (isComplete) {
        rows.push({ row, index: recipe.repeat ? index : null });
      }
    });
  }
  return rows;
};
