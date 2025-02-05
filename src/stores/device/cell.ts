import { makeAutoObservable } from 'mobx';
import { hexToRgb, isHex, rgbToHex } from '@/utils/color';
import i18n from '~/i18n/react/config';
import { cellType, type CellType, type CellTypeEntry } from './cell-type';
import type { CellMeta, EnumTranslations, NameTranslations } from './types';

export default class Cell {
  public id: string;
  public deviceId: string;
  public controlId: string;
  public type: CellType | 'incomplete' = 'incomplete';
  declare error: string | boolean;
  declare min?: number;
  declare max?: number;
  declare step: number;
  declare order: number;

  private _value: any = null;
  private _readOnly: boolean | null = null;
  private _name: string;
  private _nameTranslations: NameTranslations = {};
  private _enumValues: { [lang: string]: { name: string; value: any }[] } = {};
  private _enumTranslations: EnumTranslations = {};
  private _units: string = '';
  readonly _sendValueUpdate: (_deviceId: string, _controlId: string, _value: any) => Promise<void>;

  constructor(id: string, sendValueUpdate: (_deviceId: string, _controlId: string, _value: any) => Promise<void>) {
    this.id = id;
    const [deviceId, controlId] = this.id.split('/');
    if (!controlId) {
      throw new Error(`Invalid cell id: ${id}`);
    }
    this.deviceId = deviceId;
    this.controlId = controlId;
    this._sendValueUpdate = sendValueUpdate;

    makeAutoObservable(this, {}, { autoBind: true });
  }

  get value(): any {
    return this._value;
  }

  set value(newValue: any) {
    this._sendValue(newValue);
  }

  get valueType() {
    return this._typeEntry().valueType;
  }

  get displayType() {
    return this._typeEntry().displayType;
  }

  get units(): string {
    return this._units || this._typeEntry().units || '';
  }

  get readOnly() {
    if (this._readOnly === null) {
      return this._typeEntry().readOnly;
    }
    return this._readOnly;
  }

  get name(): string {
    return this._nameTranslations[i18n.language] || this._nameTranslations.en || this._name || this.controlId;
  }

  get isEnum(): boolean {
    return !!Object.keys(this._enumTranslations).length;
  }

  get enumValues() {
    if (!this._enumValues[i18n.language]) {
      this._enumValues[i18n.language] = Object.keys(this._enumTranslations)
        .map((value) => ({
          name: this.getEnumName(value),
          value: this.valueType === 'number' ? Number(value) : value,
        }))
        .sort((a, b) => (a.value as any) - (b.value as any));
    }
    return this._enumValues[i18n.language];
  }

  get isComplete() {
    return this.type !== 'incomplete' && (this._isButton() || this._value !== '-'); // / ozk замена null на  '-'
  }

  receiveValue(newValue: any) {
    if (!newValue) {
      this._value = this._isString() ? '' : '-';
    } else {
      this._setCellValue(newValue);
    }
  }

  setType(type: CellType) {
    if (type) {
      if (cellType.has(type)) {
        this.type = type;
      } else {
        const cellValue = String(this.value).trim().replace(',', '.');
        const parsedValue = parseFloat(cellValue) || parseInt(cellValue, 10);
        const isValueNumber = isFinite(parsedValue); // (not NaN, Infinity, -Infinity)
        const notContainOtherCharacters = cellValue.length === String(parsedValue).length;

        if (isValueNumber && notContainOtherCharacters) {
          this.type = 'value';
          return;
        }
      }
    } else {
      this.type = 'incomplete';
    }

    if (this._value !== null) {
      this._setCellValue(this._value);
    } else if (this._isString()) {
      this._setCellValue('');
    }
  }

  setName(name: string) {
    this._name = name;
  }

  setUnits(units: string) {
    this._units = units;
  }

  setReadOnly(readOnly: boolean | null) {
    if (readOnly === null || readOnly === undefined) {
      this._readOnly = null;
    } else {
      this._readOnly = !!readOnly;
    }
  }

  setMin(min?: string | number) {
    this.min = Number(min);
  }

  setMax(max?: string | number) {
    this.max = Number(max);
  }

  setStep(step?: string | number) {
    this.step = Number(step);
  }

  setOrder(order: string | number) {
    this.order = Number(order);
  }

  setError(error: string | boolean) {
    if (typeof error === 'string') {
      const pos = error.indexOf('p');
      if (pos !== -1) {
        this.error = error.replace('p', '');
        return;
      }
    }
    this.error = error;
  }

  setMeta(meta: string) {
    try {
      const parsedMeta: CellMeta = meta ? JSON.parse(meta) : {};

      Object.keys(parsedMeta).forEach((key) => {
        switch (key) {
          case 'title':
            this._nameTranslations = parsedMeta.title;
            break;
          case 'enum':
            this._enumTranslations = parsedMeta.enum;
            this._enumValues = {};
            break;
          case 'readonly':
            this.setReadOnly(parsedMeta.readonly);
            break;
          case 'type':
            this.setType(parsedMeta.type);
            break;
          case 'min':
            this.setMin(parsedMeta.min);
            break;
          case 'max':
            this.setMax(parsedMeta.max);
            break;
          case 'precision':
            this.setStep(parsedMeta.precision);
            break;
          case 'units':
            this.setUnits(parsedMeta.units);
            break;
          case 'order':
            this.setOrder(parsedMeta.order);
            break;
          case 'error':
            this.setError(parsedMeta.error);
            break;
          default:
            // unsettanble
        }
      });
    } catch (e) {
      console.warn(`Failed to parse meta for ${this.id}: ${e}`);
    }
  }

  getEnumName(value: string) {
    if (this._enumTranslations[value]) {
      if (this._enumTranslations[value][i18n.language]) {
        return this._enumTranslations[value][i18n.language];
      }
      if (i18n.language !== 'en' && this._enumTranslations[value].en) {
        return this._enumTranslations[value].en;
      }
    }
    return value;
  }

  private async _sendValue(value: any) {
    if (!this.isComplete || this.readOnly) {
      return;
    }
    this._setCellValue(value === '' && !this._isString() ? this._value : value);
    await this._sendValueUpdate(this.deviceId, this.controlId, this._getStringifiedValue());
  }

  private _getStringifiedValue() {
    switch (this.valueType) {
      case 'boolean':
        return this._value ? '1' : '0';
      case 'pushbutton':
        return '1';
      case 'rgb':
        return hexToRgb(this._value);
      default:
        return String(this._value);
    }
  }

  private _setCellValue(value: any) {
    switch (this.valueType) {
      case 'number':
        this._value = Number(value);
        break;
      case 'boolean':
        this._value = typeof value === 'boolean' ? value : value === '1';
        break;
      case 'pushbutton':
        // unsettable
        break;
      case 'rgb':
        if (isHex(value)) {
          this._value = value;
        } else if (/^\d{1,3};\d{1,3};\d{1,3}$/.test(value)) {
          const [r, g, b] = value.split(';');
          this._value = rgbToHex(r, g, b);
        } else {
          this._value = null;
        }
        break;
      default:
        this._value = String(value);
        break;
    }
  }

  private _isButton() {
    return this.type === 'pushbutton';
  }

  private _isString() {
    return this.isComplete && this.valueType === 'string';
  }

  private _typeEntry(): CellTypeEntry {
    return cellType.has(this.type) ? cellType.get(this.type) : cellType.get('text');
  }
}
