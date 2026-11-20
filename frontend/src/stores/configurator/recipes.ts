import { Conditions } from '@/stores/device-manager/device-tab/device-settings-editor/conditions';
import { findType } from './catalog';
import type {
  NewDeviceRow, RecipeFit, RecipeModel, RecipeRow, RoleId, SerialDevice, WbRecipe,
} from './types';

// Готовые наборы каналов по моделям WB; {n} в имени контрола — номер канала от 1 до repeat.
// Сюда попадают только модели без режимов: набор их контролов не зависит от настроек.
const RECIPES: WbRecipe[] = [
  {
    models: { 'wb-msw-v4': 'WB-MSW v.4' },
    channels: [
      { type: 'temperature_sensor', bind: { temperature: 'Temperature' } },
      { type: 'humidity_sensor', bind: { humidity: 'Humidity' } },
      { type: 'co2_sensor', bind: { co2: 'CO2' } },
      { type: 'illuminance_sensor', bind: { illuminance: 'Illuminance' } },
    ],
  },
  {
    models: { 'wb-ms-thls-v2': 'WB-MS-THLS v.2' },
    channels: [
      { type: 'temperature_sensor', bind: { temperature: 'Temperature' } },
      { type: 'humidity_sensor', bind: { humidity: 'Humidity' } },
      { type: 'illuminance_sensor', bind: { illuminance: 'Illuminance' } },
    ],
  },
  {
    models: { 'wb-mrps6': 'WB-MRPS6', 'wb-mr6lv': 'WB-MR6LV' },
    repeat: 6,
    channels: [{ type: 'switch', bind: { on_off: 'K{n}' } }],
  },
  {
    models: {
      'wb-mr6c': 'WB-MR6C',
      'wb-mr6cv3': 'WB-MR6C v.3',
      'wb-mr6cu': 'WB-MR6CU',
      'wb-mr6c-nc': 'WB-MR6C-NC',
      'wb-mr3': 'WB-MR3',
      'wb-mrm2-mini': 'WB-MRM2-mini-NO-inputs',
    },
    repeat: 6,
    counts: { 'WB-MR3': 3, 'WB-MRM2-mini-NO-inputs': 2 },
    // Пара выходов в режиме штор не подходит: ею управляет привод, её K только для чтения.
    channels: [{
      type: 'switch',
      bind: { on_off: 'K{n}' },
      condition: 'isDefined(curtain{pair}_mode)==0||curtain{pair}_mode==0',
    }],
    skipped: 'Curtain {n} Open',
  },
  {
    // Управлять в ИБП нечем, в приложения идут только показания.
    models: { wb_ups_v3: 'wb_ups_v3' },
    controlNames: true,
    channels: [
      { type: 'number_sensor', bind: { number: 'battery_charge_level' } },
      { type: 'number_sensor', bind: { number: 'input_voltage' } },
      { type: 'number_sensor', bind: { number: 'output_voltage' } },
      { type: 'number_sensor', bind: { number: 'charging_input_current' } },
      { type: 'temperature_sensor', bind: { temperature: 'battery_temperature' } },
    ],
  },
  {
    models: { 'wb-mdm3': 'tpl1_wb_mdm3' },
    repeat: 3,
    channels: [{ type: 'light', bind: { on_off: 'K{n}', brightness: 'Channel {n}' } }],
  },
];

// Названия моделей, у которых тип шаблона не годится для показа.
const TITLES: Record<string, string> = {
  tpl1_wb_mdm3: 'WB-MDM3',
  wb_ups_v3: 'WB-UPS v.3',
  'WB-MRM2-mini-NO-inputs': 'WB-MRM2-mini',
};

// Одинаковые каналы показываются одним типом со счётчиком.
const modelsOf = (recipe: WbRecipe): RecipeModel[] => {
  const types = Array.from(new Set(recipe.channels.map((channel) => channel.type)));
  const same = types.length === 1 ? recipe.channels.length : 1;
  return Object.values(recipe.models).map((deviceType) => ({
    title: TITLES[deviceType] ?? deviceType,
    types,
    count: recipe.counts?.[deviceType] ?? recipe.repeat ?? same,
  }));
};

// Все модели, для которых есть рецепт.
export const recipeModels = (): RecipeModel[] => RECIPES.flatMap(modelsOf);

// Рецепт по модели из конфига порта, а без него — из идентификатора вида «модель_адрес».
const findRecipe = (deviceId: string, serial?: SerialDevice) => {
  if (serial) {
    return RECIPES.find((recipe) => Object.values(recipe.models).includes(serial.deviceType));
  }
  const model = /^(.+)_\d+$/.exec(deviceId)?.[1];
  return RECIPES.find((recipe) => model in recipe.models);
};

// Идентификатор устройства в MQTT по записи конфига порта; null — модели нет в рецептах.
export const serialDeviceId = (deviceType: string, slaveId: string | number, id?: string) => {
  const model = RECIPES.flatMap((recipe) => Object.entries(recipe.models))
    .find(([, type]) => type === deviceType)?.[0];
  return id || (model ? `${model}_${slaveId}` : null);
};

const conditions = new Conditions();

// Условие в синтаксисе шаблонов wb-mqtt-serial над параметрами устройства из конфига порта.
const holds = (condition: string, params: Record<string, unknown>) => {
  const names = Array.from(new Set(condition.match(/[A-Za-z_]\w*/g))).filter((name) => name !== 'isDefined');
  return !!conditions.getFunction(condition, names)?.(...names.map((name) => params[name]));
};

// Строки по рецепту модели; null — рецепта нет. Берутся только существующие, свободные и годные
// для роли контролы, канал без контрола обязательной роли пропускается.
export const recipeRows = (
  deviceId: string, controlIds: string[], used: Set<string>, isFit: RecipeFit = () => true, serial?: SerialDevice,
): RecipeRow[] | null => {
  const recipe = findRecipe(deviceId, serial);
  if (!recipe) {
    return null;
  }
  const isFree = (controlId: string) => controlIds.includes(controlId) && !used.has(`${deviceId}/${controlId}`);
  const rows: RecipeRow[] = [];

  for (let index = 1; index <= (recipe.repeat ?? 1); index += 1) {
    const place = (text: string) => text
      .replace(/{n}/g, String(index))
      .replace(/{pair}/g, String(Math.ceil(index / 2)));
    recipe.channels.forEach(({ type, bind, condition }) => {
      if (condition && !holds(place(condition), serial?.params ?? {})) {
        return;
      }
      const row: NewDeviceRow = { type, name: '', bind: {} };
      const roles = findType(type).roles;
      const isComplete = roles.every(([role, isRequired]) => {
        const controlId = bind[role] && place(bind[role]);
        if (controlId && isFree(controlId) && isFit(controlId, role)) {
          row.bind[role as RoleId] = `${deviceId}/${controlId}`;
          return true;
        }
        return !isRequired;
      });
      if (isComplete) {
        rows.push({ row, index: recipe.repeat ? index : null, ...(recipe.controlNames ? { byControl: true } : {}) });
      }
    });
  }
  return rows;
};

// Сколько частей устройства рецепт не берёт из-за режима, например приводов штор у реле.
export const recipeSkipped = (deviceId: string, controlIds: string[], serial?: SerialDevice) => {
  const { skipped, repeat = 1 } = findRecipe(deviceId, serial) ?? {};
  return skipped
    ? Array.from({ length: repeat }, (_, index) => skipped.replace('{n}', String(index + 1)))
      .filter((controlId) => controlIds.includes(controlId)).length
    : 0;
};

// Название модели устройства по рецептам; null — рецепта нет.
export const recipeModelTitle = (deviceId: string, serial?: SerialDevice) => {
  const recipe = findRecipe(deviceId, serial);
  const deviceType = serial?.deviceType ?? recipe?.models[/^(.+)_\d+$/.exec(deviceId)?.[1]];
  return recipe ? TITLES[deviceType] ?? deviceType : null;
};
