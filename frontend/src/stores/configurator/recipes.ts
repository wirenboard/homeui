import { Conditions } from '@/stores/device-manager/device-tab/device-settings-editor/conditions';
import { findType } from './catalog';
import type {
  NewDeviceRow, RecipeFit, RecipeModel, RecipeRow, RoleId, SerialDevice, WbRecipe, WbRecipeChannel,
} from './types';

// Мощность и энергия счётчика: суммарные по каналу, а если их нет — по каждой фазе.
const meterChannels = (prefix: string): WbRecipeChannel[] => [
  { type: 'power_sensor', bind: { power: `${prefix}Total P` } },
  { type: 'energy_meter', bind: { energy: `${prefix}Total AP energy` } },
  ...[1, 2, 3].flatMap((phase): WbRecipeChannel[] => [
    { type: 'power_sensor', bind: { power: `${prefix}P L${phase}` }, unless: `${prefix}Total P` },
    {
      type: 'energy_meter',
      bind: { energy: `${prefix}AP energy L${phase}` },
      unless: `${prefix}Total AP energy`,
    },
  ]),
];

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
    models: { 'wb-mrps6': 'WB-MRPS6', 'wb-mr6lv': 'WB-MR6LV', 'wb-mr3lv': 'WB-MR3LV' },
    repeat: 6,
    counts: { 'WB-MR3LV': 3 },
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
    // Внешние датчики 1-Wire не берутся: по контролам не видно, какие из них подключены.
    models: { 'wb-ms': 'tpl1_wb_ms_v2' },
    channels: [
      { type: 'temperature_sensor', bind: { temperature: 'Temperature' } },
      { type: 'humidity_sensor', bind: { humidity: 'Humidity' } },
      { type: 'illuminance_sensor', bind: { illuminance: 'Illuminance' } },
    ],
  },
  {
    // По одному датчику на вход: в новом шаблоне это первый датчик шины.
    models: { 'wb-m1w2': 'WB-M1W2 v.3 MULTIPLE W1' },
    repeat: 2,
    controlNames: true,
    channels: [
      { type: 'temperature_sensor', bind: { temperature: 'External Sensor {n}' } },
      { type: 'temperature_sensor', bind: { temperature: 'Temperature {n}:1' } },
    ],
  },
  {
    // Выходы 0–10 В обычно управляют диммируемыми драйверами света.
    models: { 'wb-mao4': 'tpl1_wb_mao4' },
    repeat: 4,
    channels: [{
      type: 'light',
      bind: { on_off: 'Channel {n} Switch', brightness: 'Channel {n} Dimming Level' },
    }],
  },
  {
    models: { 'wb-map12e': 'WB-MAP12E fw2' },
    repeat: 4,
    controlNames: true,
    channels: meterChannels('Ch {n} '),
  },
  {
    models: { 'wb-map3e': 'WB-MAP3E fw2', 'wb-map3et': 'WB-MAP3ET' },
    controlNames: true,
    channels: meterChannels(''),
  },
  {
    models: { 'wb-map6s': 'WB-MAP6S fw2' },
    repeat: 6,
    controlNames: true,
    channels: [
      { type: 'power_sensor', bind: { power: 'P {n}' } },
      { type: 'energy_meter', bind: { energy: 'AP energy {n}' } },
    ],
  },
  {
    // Защита от протечек: общий признак протечки, входы в режиме датчика, краны и счётчики воды.
    models: { 'wb-mwac-v2': 'WB-MWAC-v2 ver2' },
    repeat: 5,
    counts: { 'WB-MWAC-v2 ver2': 1 },
    controlNames: true,
    byChannel: true,
    channels: [
      { type: 'leak_sensor', bind: { leak: 'Leakage Mode' } },
      {
        type: 'leak_sensor',
        bind: { leak: 'Input F{n}' },
        condition: 'isDefined(in{n}_mode)==0||in{n}_mode==5',
      },
      // Шестой вход по умолчанию обычный дискретный, датчиком протечки он бывает только по настройке.
      { type: 'leak_sensor', bind: { leak: 'Input S6' }, condition: 'in6_mode==5' },
      { type: 'switch', bind: { on_off: 'Output K{n}' } },
      { type: 'switch', bind: { on_off: 'Cleaning Mode' } },
      { type: 'number_sensor', bind: { number: 'P{n} Volume' } },
    ],
  },
  {
    // Реле с измерением: у каждого выхода свои мощность и накопленная энергия.
    models: { 'wb-mrwm2': 'WB-MRWM2' },
    repeat: 2,
    controlNames: true,
    channels: [
      { type: 'switch', bind: { on_off: 'K{n}' } },
      { type: 'power_sensor', bind: { power: 'P L{n}' } },
      { type: 'energy_meter', bind: { energy: 'AP energy L{n}' } },
    ],
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
    // Режим ленты задаёт набор контролов, поэтому в рецепте перечислены лампы всех режимов:
    // создаются те, чьи контролы есть на контроллере.
    models: { 'wb-led': 'WB-LED' },
    repeat: 4,
    counts: { 'WB-LED': 1 },
    controlNames: true,
    channels: [
      {
        type: 'light',
        bind: { on_off: 'RGB Strip', brightness: 'RGB Strip Brightness', color: 'RGB Palette' },
      },
      { type: 'light', bind: { on_off: 'Channel {n}', brightness: 'Channel {n} Brightness' } },
      { type: 'light', bind: { on_off: 'Channels 1_2', brightness: 'Channels 1_2 Brightness' } },
      { type: 'light', bind: { on_off: 'Channels 3_4', brightness: 'Channels 3_4 Brightness' } },
      { type: 'light', bind: { on_off: 'Channels 1_2_3_4', brightness: 'Channels 1_2_3_4 Brightness' } },
      {
        type: 'light',
        bind: { on_off: 'CCT{n}', brightness: 'CCT{n} Brightness', color_temperature: 'CCT{n} Temperature' },
      },
    ],
  },
  {
    models: { 'wb-mdm3': 'tpl1_wb_mdm3' },
    repeat: 3,
    channels: [{ type: 'light', bind: { on_off: 'K{n}', brightness: 'Channel {n}' } }],
  },
];

// Шаблоны одной модели для разных версий прошивки.
const TYPE_ALIASES: Record<string, string> = {
  'WB-LED-since-fw-3.8': 'WB-LED',
  'WB-MDM3': 'tpl1_wb_mdm3',
  'WB-MDM3-since-fw-2.12': 'tpl1_wb_mdm3',
  'WB-MS v.2': 'tpl1_wb_ms_v2',
  'WB-MS-v2-since-fw-4.36': 'tpl1_wb_ms_v2',
  'WB-M1W2 BUTTONS': 'WB-M1W2 v.3 MULTIPLE W1',
  'WB-MAO4': 'tpl1_wb_mao4',
  'WB-MAO4-since-fw-2.9': 'tpl1_wb_mao4',
  'WB-MAP3E': 'WB-MAP3E fw2',
  'WB-MAP6S': 'WB-MAP6S fw2',
  'WB-MWAC-v2': 'WB-MWAC-v2 ver2',
};

const typeOf = (serial: SerialDevice) => TYPE_ALIASES[serial.deviceType] ?? serial.deviceType;

// Названия изделий там, где тип шаблона не годится для показа или шаблон общий для нескольких.
const TITLES: Record<string, string> = {
  tpl1_wb_mdm3: 'WB-MDM3',
  wb_ups_v3: 'WB-UPS v.3',
  'WB-MRM2-mini-NO-inputs': 'WB-MRM2-mini',
  'WB-MR6C': 'WB-MR6C v.2, WB-MR6LV/HV',
  'WB-MR3': 'WB-MR3LV/HV, WB-MRWL3',
  tpl1_wb_ms_v2: 'WB-MS v.2',
  'WB-M1W2 v.3 MULTIPLE W1': 'WB-M1W2 v.3',
  tpl1_wb_mao4: 'WB-MAO4',
  'WB-MAP12E fw2': 'WB-MAP12E',
  'WB-MAP3E fw2': 'WB-MAP3E',
  'WB-MAP6S fw2': 'WB-MAP6S',
  'WB-MWAC-v2 ver2': 'WB-MWAC v.2',
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

// Рецепт для них есть, но в списке моделей они лишние: старые шаблоны актуальных изделий
// и изделия, снятые с производства.
const UNLISTED = new Set(['WB-MR6LV', 'WB-MR3LV', 'WB-MR6C-NC', 'WB-MS-THLS v.2']);

// Модели с рецептом, которые стоит показывать пользователю.
export const recipeModels = (): RecipeModel[] => RECIPES.flatMap(modelsOf)
  .filter(({ title }) => !UNLISTED.has(title));

// Рецепт по модели из конфига порта, а без него — из идентификатора вида «модель_адрес».
const findRecipe = (deviceId: string, serial?: SerialDevice) => {
  if (serial) {
    return RECIPES.find((recipe) => Object.values(recipe.models).includes(typeOf(serial)));
  }
  const model = /^(.+)_\d+$/.exec(deviceId)?.[1];
  return RECIPES.find((recipe) => model in recipe.models);
};

// Идентификатор устройства в MQTT по записи конфига порта; null — модели нет в рецептах.
export const serialDeviceId = (deviceType: string, slaveId: string | number, id?: string) => {
  const model = RECIPES.flatMap((recipe) => Object.entries(recipe.models))
    .find(([, type]) => type === (TYPE_ALIASES[deviceType] ?? deviceType))?.[0];
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
  const places: number[] = [];

  for (let index = 1; index <= (recipe.repeat ?? 1); index += 1) {
    const place = (text: string) => text
      .replace(/{n}/g, String(index))
      .replace(/{pair}/g, String(Math.ceil(index / 2)));
    recipe.channels.forEach(({
      type, bind, condition, unless,
    }, position) => {
      if (unless && controlIds.includes(place(unless))) {
        return;
      }
      // Канал без номера в именах контролов берётся один раз.
      if (index > 1 && !Object.values(bind).some((controlId) => controlId.includes('{'))) {
        return;
      }
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
        places.push(position);
      }
    });
  }
  // Обычно каналы идут по номерам, а с byChannel — группами в порядке рецепта.
  return recipe.byChannel
    ? rows.map((row, at) => ({ row, at })).sort((a, b) => places[a.at] - places[b.at] || a.at - b.at)
      .map(({ row }) => row)
    : rows;
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
  const deviceType = serial ? typeOf(serial) : recipe?.models[/^(.+)_\d+$/.exec(deviceId)?.[1]];
  return recipe ? TITLES[deviceType] ?? deviceType : null;
};
