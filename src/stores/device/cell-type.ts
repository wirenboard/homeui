export enum CellComponent {
  Alert = 'alarm',
  Range = 'range',
  Button = 'button',
  Colorpicker = 'rgb',
  Switch = 'switch',
  Text = 'text',
  Value = 'value',
}

export type CellValueType = 'string' | 'number' | 'boolean' | 'pushbutton' | 'rgb';

export interface CellTypeEntry {
  valueType: CellValueType;
  displayType: CellComponent;
  readOnly: boolean;
  units?: string;
}

export const cellType = new Map<string, CellTypeEntry>([
  ['text', {
    valueType: 'string',
    displayType: CellComponent.Text,
    readOnly: true,
  }],
  ['switch', {
    valueType: 'boolean',
    displayType: CellComponent.Switch,
    readOnly: false,
  }],
  ['wo-switch', {
    valueType: 'boolean',
    displayType: CellComponent.Switch,
    readOnly: false,
  }],
  ['alarm', {
    valueType: 'boolean',
    displayType: CellComponent.Alert,
    readOnly: true,
  }],
  ['pushbutton', {
    valueType: 'pushbutton',
    displayType: CellComponent.Button,
    readOnly: false,
  }],
  ['temperature', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'deg C',
    readOnly: true,
  }],
  ['rel_humidity', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: '%, RH',
    readOnly: true,
  }],
  ['atmospheric_pressure', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'mbar',
    readOnly: true,
  }],
  ['rainfall', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'mm/h',
    readOnly: true,
  }],
  ['wind_speed', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'm/s',
    readOnly: true,
  }],
  ['power', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'W',
    readOnly: true,
  }],
  ['power_consumption', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'kWh',
    readOnly: true,
  }],
  ['voltage', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'V',
    readOnly: true,
  }],
  ['water_flow', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'm^3/h',
    readOnly: true,
  }],
  ['water_consumption', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'm^3',
    readOnly: true,
  }],
  ['heat_power', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'Gcal/h',
    readOnly: true,
  }],
  ['heat_energy', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'Gcal',
    readOnly: true,
  }],
  ['resistance', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'Ohm',
    readOnly: true,
  }],
  ['concentration', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'ppm',
    readOnly: true,
  }],
  ['pressure', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'bar',
    readOnly: true,
  }],
  ['lux', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'lx',
    readOnly: true,
  }],
  ['sound_level', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'dB',
    readOnly: true,
  }],
  ['range', {
    valueType: 'number',
    displayType: CellComponent.Range,
    readOnly: false,
  }],
  ['value', {
    valueType: 'number',
    displayType: CellComponent.Value,
    readOnly: true,
  }],
  ['rgb', {
    valueType: 'rgb',
    displayType: CellComponent.Colorpicker,
    readOnly: false,
  }],
  ['current', {
    valueType: 'number',
    displayType: CellComponent.Value,
    units: 'A',
    readOnly: true,
  }],
]);

export type CellType = Parameters<typeof cellType.get>[0];
