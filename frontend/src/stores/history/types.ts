export type PlotlyData = any;
export type PlotlyLayout = any;
export type PlotRelayoutEvent = any;

export interface ChartsControl {
  name: string;
  group: string;
  deviceId: string;
  controlId: string;
  valueType?: string;
  widget?: { id: string; name: string };
}

export interface ChartProgress {
  value: number;
  isLoaded: boolean;
}

export enum ChartType {
  Number = 'number',
  Boolean = 'boolean',
  String = 'string',
  UpTime = 'up-time',
}

export interface TableRow {
  date: number;
  value: Array<string | number | null>;
  showMs: boolean;
}

export interface HistoryValue {
  c: number;
  i: number;
  max: string;
  min: string;
  retain: boolean;
  t: number;
  v: string | number;
}

export interface LoadHistoryResponse {
  values: HistoryValue[];
}

export interface UrlControl {
  d: string;
  c: string;
  w?: string;
}
