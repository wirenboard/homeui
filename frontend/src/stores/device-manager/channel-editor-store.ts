import { makeObservable, computed } from 'mobx';
import { NumberStore, StringStore } from '@/stores/json-schema-editor';
import { Conditions } from './conditions';
import { WbDeviceParameterEditor } from './parameter-editor-store';
import type { WbDeviceTemplateChannel, WbDeviceTemplateChannelSettings } from './types';

enum WbDeviceChannelModes {
  DISABLED = 'do not read',
  QUEUE_ORDER = 'in queue order',
  PERIOD_200_MS = '200 ms',
  PERIOD_100_MS = '100 ms',
  CUSTOM_PERIOD = 'custom period',
}

const DEFAULT_PERIOD = 1000;

function getEditorValuesFromChannelData(data: unknown): { mode: WbDeviceChannelModes; period?: number } {
  if (data === undefined) {
    return {
      mode: WbDeviceChannelModes.QUEUE_ORDER,
      period: DEFAULT_PERIOD,
    };
  }
  const dataAsChannel = data as WbDeviceTemplateChannel;
  if (dataAsChannel.enabled === false) {
    return {
      mode: WbDeviceChannelModes.DISABLED,
      period: DEFAULT_PERIOD,
    };
  }
  if (typeof dataAsChannel.read_period_ms !== 'number') {
    return {
      mode: WbDeviceChannelModes.QUEUE_ORDER,
      period: DEFAULT_PERIOD,
    };
  }
  if (dataAsChannel.read_period_ms === 200) {
    return {
      mode: WbDeviceChannelModes.PERIOD_200_MS,
      period: DEFAULT_PERIOD,
    };
  }
  if (dataAsChannel.read_period_ms === 100) {
    return {
      mode: WbDeviceChannelModes.PERIOD_100_MS,
      period: DEFAULT_PERIOD,
    };
  }
  return {
    mode: WbDeviceChannelModes.CUSTOM_PERIOD,
    period: dataAsChannel.read_period_ms,
  };
}

export class WbDeviceChannelEditor {
  public channel: WbDeviceTemplateChannel;
  public mode: StringStore;
  public period: NumberStore;

  private _conditionFn?: Function;
  private _dependencies?: string[];
  private _parameters: Map<string, WbDeviceParameterEditor>;

  constructor(
    channel: WbDeviceTemplateChannel,
    initialValue: unknown,
    parameters: Map<string, WbDeviceParameterEditor>
  ) {
    this.channel = channel;
    this._parameters = parameters;
    const { mode, period } = getEditorValuesFromChannelData(initialValue === undefined ? channel : initialValue);
    this.mode = new StringStore({
      type: 'string',
      enum: [
        WbDeviceChannelModes.DISABLED,
        WbDeviceChannelModes.QUEUE_ORDER,
        WbDeviceChannelModes.PERIOD_200_MS,
        WbDeviceChannelModes.PERIOD_100_MS,
        WbDeviceChannelModes.CUSTOM_PERIOD,
      ],
      default:  WbDeviceChannelModes.QUEUE_ORDER,
      options: {
        compact: true,
      },
    }, mode, true);

    this.period = new NumberStore({
      type: 'integer',
      minimum: 0,
      maximum: 172800000,
      default: DEFAULT_PERIOD,
      options: {
        compact: true,
      },
    }, period, true);

    this._conditionFn = new Conditions().getFunction(channel.condition, channel.dependencies);
    this._dependencies = channel.dependencies;

    makeObservable(this, {
      isEnabledByCondition: computed,
      hasErrors: computed,
      isDirty: computed,
      hasCustomPeriod: computed,
      customProperties: computed,
    });
  }

  get isEnabledByCondition() {
    if (!this._conditionFn) {
      return true;
    }
    const res = this._conditionFn.apply(null, this._dependencies?.map((dep) => {
      const param = this._parameters.get(dep);
      return param !== undefined && typeof param.value === 'number' ? param.value : undefined;
    }));
    return res;
  }

  get hasErrors() {
    return this.mode.hasErrors || (this.hasCustomPeriod && this.period.hasErrors);
  }

  get hasCustomPeriod() {
    return this.mode.value === WbDeviceChannelModes.CUSTOM_PERIOD;
  }

  get customProperties() : WbDeviceTemplateChannelSettings | undefined {
    let res: WbDeviceTemplateChannelSettings = {
      name: this.channel.name,
    };
    switch (this.mode.value) {
      case WbDeviceChannelModes.DISABLED: {
        if (this.channel.enabled !== false) {
          res['enabled'] = false;
        }
        break;
      }
      case WbDeviceChannelModes.QUEUE_ORDER: {
        if (this.channel.enabled === false) {
          res['enabled'] = true;
        }
        break;
      }
      case WbDeviceChannelModes.PERIOD_200_MS: {
        if (this.channel.enabled === false) {
          res['enabled'] = true;
        }
        if (this.channel.read_period_ms !== 200) {
          res['read_period_ms'] = 200;
        }
        break;
      }
      case WbDeviceChannelModes.PERIOD_100_MS: {
        if (this.channel.enabled === false) {
          res['enabled'] = true;
        }
        if (this.channel.read_period_ms !== 100) {
          res['read_period_ms'] = 100;
        }
        break;
      }
      case WbDeviceChannelModes.CUSTOM_PERIOD: {
        if (this.channel.enabled === false) {
          res['enabled'] = true;
        }
        const periodValue = this.period.value;
        if (this.channel.read_period_ms !== periodValue && typeof periodValue === 'number') {
          res['read_period_ms'] = periodValue;
        }
        break;
      }
    }
    if (Object.keys(res).length === 1) {
      return undefined;
    }
    return res;
  }

  get isDirty() {
    if (this.mode.isDirty) {
      return true;
    }
    if (this.mode.value === WbDeviceChannelModes.CUSTOM_PERIOD && this.period.isDirty) {
      return true;
    }
    return false;
  }

  setDefault() {
    const { mode, period } = getEditorValuesFromChannelData(this.channel);
    this.mode.setValue(mode);
    this.period.setValue(period);
  }

  commit() {
    this.mode.commit();
    this.period.commit();
  }

  reset() {
    this.mode.reset();
    this.period.reset();
  }
}
