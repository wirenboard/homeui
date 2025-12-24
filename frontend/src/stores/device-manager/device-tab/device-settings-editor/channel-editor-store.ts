import { makeObservable, computed, observable, action } from 'mobx';
import { NumberStore, StringStore } from '@/stores/json-schema-editor';
import { firmwareIsNewerOrEqual } from '~/utils/fwUtils';
import type { WbDeviceTemplateChannel, WbDeviceTemplateChannelSettings } from '../../types';
import { Conditions } from './conditions';
import type { WbDeviceParameterEditor } from './parameter-editor-store';

enum WbDeviceChannelModes {
  Disabled = 'do not read',
  QueueOrder = 'in queue order',
  Period200Ms = '200 ms',
  Period100Ms = '100 ms',
  CustomPeriod = 'custom period',
  UsingFastModbus = 'using Fast Modbus',
}

const DefaultPeriod = 1000;

function getEditorValuesFromChannelData(data?: WbDeviceTemplateChannelSettings): { mode: WbDeviceChannelModes; period?: number } {
  if (data === undefined) {
    return {
      mode: WbDeviceChannelModes.QueueOrder,
      period: DefaultPeriod,
    };
  }
  if (data.enabled === false) {
    return {
      mode: WbDeviceChannelModes.Disabled,
      period: DefaultPeriod,
    };
  }
  if (typeof data.read_period_ms !== 'number') {
    return {
      mode: WbDeviceChannelModes.QueueOrder,
      period: DefaultPeriod,
    };
  }
  if (data.read_period_ms === 200) {
    return {
      mode: WbDeviceChannelModes.Period200Ms,
      period: DefaultPeriod,
    };
  }
  if (data.read_period_ms === 100) {
    return {
      mode: WbDeviceChannelModes.Period100Ms,
      period: DefaultPeriod,
    };
  }
  return {
    mode: WbDeviceChannelModes.CustomPeriod,
    period: data.read_period_ms,
  };
}

export class WbDeviceChannelEditor {
  public channel: WbDeviceTemplateChannel;
  public mode: StringStore;
  public period: NumberStore;
  public isSupportedByFirmware: boolean = true;

  private _conditionFn?: Function;
  private _dependencies?: string[];
  private _parameters: Map<string, WbDeviceParameterEditor>;

  constructor(
    channel: WbDeviceTemplateChannel,
    initialValue: WbDeviceTemplateChannelSettings | undefined,
    parameters: Map<string, WbDeviceParameterEditor>
  ) {
    this.channel = channel;
    this._parameters = parameters;
    const { mode, period } = getEditorValuesFromChannelData(initialValue === undefined ? channel : initialValue);
    if (this.channel['semi-sporadic'] === true || this.channel.sporadic === true) {
      this.mode = new StringStore({
        type: 'string',
        enum: [
          WbDeviceChannelModes.Disabled,
          WbDeviceChannelModes.UsingFastModbus,
        ],
        default: WbDeviceChannelModes.UsingFastModbus,
        options: {
          compact: true,
        },
      }, 
      mode === WbDeviceChannelModes.Disabled ? mode : WbDeviceChannelModes.UsingFastModbus, 
      true);
    } else {
      this.mode = new StringStore({
        type: 'string',
        enum: [
          WbDeviceChannelModes.Disabled,
          WbDeviceChannelModes.QueueOrder,
          WbDeviceChannelModes.Period200Ms,
          WbDeviceChannelModes.Period100Ms,
          WbDeviceChannelModes.CustomPeriod,
        ],
        default:  WbDeviceChannelModes.QueueOrder,
        options: {
          compact: true,
        },
      }, 
      mode, 
      true);
    }

    this.period = new NumberStore({
      type: 'integer',
      minimum: 0,
      maximum: 172800000,
      default: DefaultPeriod,
      options: {
        compact: true,
      },
    }, period, true);

    this._conditionFn = new Conditions().getFunction(channel.condition, channel.dependencies);
    this._dependencies = channel.dependencies;

    makeObservable(this, {
      isSupportedByFirmware: observable,
      isEnabledByCondition: computed,
      hasErrors: computed,
      isDirty: computed,
      hasCustomPeriod: computed,
      customProperties: computed,
      shouldStoreInConfig: computed,
      setFirmwareInDevice: action,
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
    return this.mode.value === WbDeviceChannelModes.CustomPeriod;
  }

  get customProperties() : WbDeviceTemplateChannelSettings | undefined {
    let res: WbDeviceTemplateChannelSettings = {
      name: this.channel.name,
    };
    switch (this.mode.value) {
      case WbDeviceChannelModes.Disabled: {
        if (this.channel.enabled !== false) {
          res['enabled'] = false;
        }
        break;
      }
      case WbDeviceChannelModes.QueueOrder:
      case WbDeviceChannelModes.UsingFastModbus: {
        if (this.channel.enabled === false) {
          res['enabled'] = true;
        }
        break;
      }
      case WbDeviceChannelModes.Period200Ms: {
        if (this.channel.enabled === false) {
          res['enabled'] = true;
        }
        if (this.channel.read_period_ms !== 200) {
          res['read_period_ms'] = 200;
        }
        break;
      }
      case WbDeviceChannelModes.Period100Ms: {
        if (this.channel.enabled === false) {
          res['enabled'] = true;
        }
        if (this.channel.read_period_ms !== 100) {
          res['read_period_ms'] = 100;
        }
        break;
      }
      case WbDeviceChannelModes.CustomPeriod: {
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
    if (this.mode.value === WbDeviceChannelModes.CustomPeriod && this.period.isDirty) {
      return true;
    }
    return false;
  }

  get shouldStoreInConfig() {
    return this.isSupportedByFirmware && this.isEnabledByCondition && !this.hasErrors;
  }

  setDefault() {
    const { mode, period } = getEditorValuesFromChannelData(this.channel);
    if (this.channel['semi-sporadic'] === true || this.channel.sporadic === true) {
      this.mode.setValue(mode === WbDeviceChannelModes.Disabled ? mode : WbDeviceChannelModes.UsingFastModbus);
    } else {
      this.mode.setValue(mode);
    }
    this.period.setValue(period);
  }

  setFirmwareInDevice(fw: string) {
    this.isSupportedByFirmware = firmwareIsNewerOrEqual(this.channel.fw, fw);
  }

  commit() {
    this.mode.commit();
    this.period.commit();
  }
}
