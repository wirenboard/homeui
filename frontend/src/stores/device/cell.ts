import { makeAutoObservable } from 'mobx';
import { hexToRgb, isHex, rgbToHex } from '@/utils/color';
import i18n from '~/i18n/react/config';
import { type CellError, cellType, type CellType, type CellTypeEntry } from './cell-type';
import type { CellMeta, EnumTranslations, NameTranslations, SendValueUpdate, ValueType } from './types';

export default class Cell {
  public id: string;
  public deviceId: string;
  public controlId: string;
  public type: CellType | 'incomplete' = 'incomplete';
  public error: CellError[] | null = null;
  public min?: number;
  public max?: number;
  public step: number;
  public order: number;

  private _value: ValueType = '';
  private _readOnly: boolean | null = null;
  private _name: string;
  private _nameTranslations: NameTranslations = {};
  private _enumValues: { [lang: string]: { name: string; value: ValueType }[] } = {};
  private _enumTranslations: EnumTranslations = {};
  private _units: string = '';
  readonly _sendValueUpdate: SendValueUpdate;

  constructor(id: string, sendValueUpdate: SendValueUpdate) {
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

  get value(): ValueType {
    return this._value;
  }

  set value(newValue: ValueType) {
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

  receiveValue(newValue: string) {
    if (!newValue) {
      if (this.valueType === 'rgb') {
        this._value = null;
      } else {
        this._value = this._isString() ? '' : '-';
      }
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

  setError(error: string) {
    this.error = error.length ? error.split('') as CellError[] : null;
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

  public getStringifiedValue(): string {
    switch (this.valueType) {
      case 'boolean':
        return this._value ? '1' : '0';
      case 'pushbutton':
        return '1';
      case 'rgb':
        return hexToRgb(this._value as string);
      default:
        return String(this._value);
    }
  }

  private async _sendValue(value: ValueType) {
    if (!this.isComplete || this.readOnly) {
      return;
    }
    this._setCellValue(value === '' && !this._isString() ? this._value : value);
    await this._sendValueUpdate(this.deviceId, this.controlId, this.getStringifiedValue());
  }

  private _setCellValue(value: ValueType) {
    const maxSafeBigInt = BigInt(Number.MAX_SAFE_INTEGER);
    switch (this.valueType) {
      case 'number':
        if (isNaN(value as number | null)) {
          this._value = 0;
        } else if (Number(value) && Number.isInteger(Number(value)) && BigInt(Number(value)) >= maxSafeBigInt) {
          // to avoid rounding we will set value as string if value is greater than max safe integer
          this._value = value;
        } else {
          this._value = Number(value);
        }
        break;
      case 'boolean':
        // it could be boolean or string '0' | '1'
        this._value = Boolean(Number(value));
        break;
      case 'pushbutton':
        // unsettable
        break;
      case 'rgb':
        if (isHex(value as string)) {
          this._value = value;
        } else if (/^\d{1,3};\d{1,3};\d{1,3}$/.test(value as string)) {
          const [r, g, b] = (value as string).split(';');
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
