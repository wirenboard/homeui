import { type ChartProgress, type ChartsControl, ChartType } from './types';

export class ChartTraits {
  channelName: string;
  progress: ChartProgress = { value: 0, isLoaded: false };
  type: ChartType = ChartType.Number;
  xValues: Date[] = [];
  yValues: Array<string | number> = [];
  text: (string | number)[] = [];
  maxErrors: (string | number)[] = [];
  minErrors: (string | number)[] = [];
  minValue?: (string | number) = undefined;
  maxValue?: (string | number) = undefined;

  constructor(chartsControl: ChartsControl) {
    this.channelName = chartsControl.name;

    if (chartsControl.valueType === 'boolean' || chartsControl.valueType === 'pushbutton') {
      this.type = ChartType.Boolean;
    } else if (chartsControl.deviceId === 'system' && chartsControl.controlId === 'Current uptime') {
      this.type = ChartType.UpTime;
    } else if (chartsControl.valueType === 'string' || chartsControl.valueType === 'rgb') {
      this.type = ChartType.String;
    }
  }

  get hasErrors() {
    return this.type === ChartType.Number;
  }

  get hasBooleanValues() {
    return this.type === ChartType.Boolean;
  }
}
