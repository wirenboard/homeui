import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import { makeAutoObservable, runInAction } from 'mobx';
import { findType, hasUnit } from './catalog';
import { clone, fromConfig, moduleName, stable, toConfig } from './model';
import type {
  BackendState,
  BackendStatus,
  BuiltConfig,
  Config,
  Device,
  DeviceRow,
  EditorModel,
  LiveControls,
  NewDeviceRow,
  ParsedConfig,
  RoleId,
  Selection,
} from './types';

const STATUS_URL = '/converter-ext/status';
const CONFIG_URL = '/converter-ext/config';
// did 0–9 зарезервированы (корневой узел Matter, bridge aid в HomeKit).
const FIRST_DID = 10;

export class ConfigParseError extends Error {
  constructor(public path: string) {
    super(path);
  }
}

export class ConfigFormatError extends Error {}

export default class ConfiguratorStore {
  devices: Device[] = [];
  raw: unknown[] = [];
  orig: ParsedConfig['orig'] = {};
  mixed: Record<string, boolean> = {};
  selection: Selection = null;
  backendState: BackendState = 'checking';
  isLoading = false;
  isSaving = false;

  private _savedModel = stable({ devices: [] });
  private _modifiedAt: number | null = null;
  private _savedExtras: Pick<ParsedConfig, 'raw' | 'orig' | 'mixed'> = { raw: [], orig: {}, mixed: {} };
  private _newCount = 0;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isDirty() {
    return stable({ devices: this.devices }) !== this._savedModel
      || stable(this.raw) !== stable(this._savedExtras.raw);
  }

  get savedModel(): EditorModel {
    return JSON.parse(this._savedModel);
  }

  get selected() {
    return this.selection ? this.devices.find((device) => device.id === this.selection.id) : undefined;
  }

  // Ключи "device/control" всех привязок модели.
  get usedKeys(): Set<string> {
    const used = new Set<string>();
    this.devices.forEach((device) => device.rows.forEach((row) => {
      Object.values(row.bind).forEach((key) => used.add(key));
    }));
    return used;
  }

  // id карточек, чьё название в module совпадает с другой карточкой.
  get nameConflicts(): Set<string> {
    const byName = new Map<string, string[]>();
    this.devices.forEach((device) => {
      const name = moduleName(device);
      if (name) {
        byName.set(name, [...(byName.get(name) ?? []), device.id]);
      }
    });
    return new Set(Array.from(byName.values()).filter((ids) => ids.length > 1).flat());
  }

  build(live: LiveControls): BuiltConfig {
    return toConfig({ devices: this.devices, raw: this.raw }, live, this.orig);
  }

  toYaml(config: Config) {
    return dumpYaml(config, { lineWidth: -1, noRefs: true });
  }

  async load() {
    this.isLoading = true;
    try {
      const status = await this._fetchStatus();
      runInAction(() => {
        this.backendState = status ? 'available' : 'unavailable';
      });
      if (!status?.has_config) {
        this._apply(fromConfig(null), null);
        return;
      }
      if (status.parses === false) {
        throw new ConfigParseError(status.path);
      }
      const response = await fetch(CONFIG_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      this._apply(fromConfig(loadYaml(await response.text()) as Config), status.modified_at ?? null);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Сохраняет конфиг; confirmOverwrite спрашивают, если файл на контроллере менялся после загрузки.
  async save(live: LiveControls, confirmOverwrite: () => Promise<boolean>): Promise<BuiltConfig | null> {
    if (this.nameConflicts.size) {
      throw new Error('Device names are not unique');
    }
    const built = this.build(live);
    this.isSaving = true;
    try {
      const status = await this._fetchStatus();
      if (status?.has_config && status.modified_at !== this._modifiedAt && !(await confirmOverwrite())) {
        return null;
      }
      const response = await fetch(CONFIG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/yaml' },
        body: this.toYaml(built.config),
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${await response.text()}`);
      }
      const saved = await this._fetchStatus();
      runInAction(() => {
        this.devices = this.devices.filter((device) => device.rows.length);
        this.orig = fromConfig(built.config).orig;
        this.mixed = {};
        this._modifiedAt = saved?.modified_at ?? null;
        this._savedModel = stable({ devices: this.devices });
        this._savedExtras = clone({ raw: this.raw, orig: this.orig, mixed: this.mixed });
        this._keepSelection();
      });
      return built;
    } finally {
      runInAction(() => {
        this.isSaving = false;
      });
    }
  }

  // Заменяет модель конфигом из файла; на контроллер попадёт только после save().
  importConfig(text: string): number {
    const config = loadYaml(text) as Config;
    if (!config || !Array.isArray(config.devices)) {
      throw new ConfigFormatError();
    }
    const parsed = fromConfig(config);
    this.devices = parsed.devices;
    this.raw = parsed.raw;
    this.orig = parsed.orig;
    this.mixed = parsed.mixed;
    this.selection = null;
    this._keepSelection();
    return config.devices.length;
  }

  select(selection: Selection) {
    this.selection = selection;
  }

  revert() {
    this.devices = this.savedModel.devices;
    Object.assign(this, clone(this._savedExtras));
    this._keepSelection();
  }

  clearAll() {
    this.devices = [];
    this.selection = null;
  }

  nextDid(): number {
    const dids = [
      FIRST_DID - 1,
      ...this.devices.flatMap((device) => device.rows.map((row) => row.did)),
      ...this.raw.map((device) => Number((device as { did?: number })?.did) || 0),
      ...Object.keys(this.orig).map(Number),
    ];
    return Math.max(...dids) + 1;
  }

  // Занятое название получает суффикс « 2», « 3», ...
  addDevice(name: string, rows: NewDeviceRow[]): Device {
    const firstDid = this.nextDid();
    const taken = new Set(this.devices.map(moduleName));
    let freeName = name;
    for (let index = 2; name.trim() && taken.has(freeName.trim()); index += 1) {
      freeName = `${name.trim()} ${index}`;
    }
    this._newCount += 1;
    const device: Device = {
      id: `new:${this._newCount}`,
      name: freeName,
      matter: true,
      alice: true,
      rows: rows.map((row, index) => ({ ...row, did: firstDid + index, group: '' })),
    };
    this.devices.push(device);
    this.selection = { id: device.id };
    return this.selected;
  }

  // Новые строки встают первыми и наследуют группу последней заполненной.
  addRows(device: Device, rows: NewDeviceRow[]) {
    const firstDid = this.nextDid();
    const lastGroup = device.rows.map((row) => row.group).filter(Boolean).pop() ?? '';
    device.rows.unshift(...rows.map((row, index) => ({ ...row, did: firstDid + index, group: lastGroup })));
  }

  removeRow(device: Device, did: number) {
    device.rows = device.rows.filter((row) => row.did !== did);
  }

  removeDevice(id: string) {
    this.devices = this.devices.filter((device) => device.id !== id);
    this._keepSelection();
  }

  setName(device: Device, name: string) {
    device.name = name;
  }

  setAdapters(target: Device, adapters: { matter?: boolean; alice?: boolean }) {
    Object.assign(target, adapters);
  }

  updateRow(row: DeviceRow, patch: Partial<Pick<DeviceRow, 'name' | 'group' | 'unit'>>) {
    Object.assign(row, patch);
  }

  // Привязка первой роли переходит на role нового типа; роли, которых нет в типе, отбрасываются.
  changeType(row: DeviceRow, type: string, role: RoleId, name: string) {
    const roles = findType(type).roles.map(([item]) => item);
    const [first, ...extra] = findType(row.type).roles.map(([item]) => item).filter((item) => row.bind[item]);
    const bind: DeviceRow['bind'] = first ? { [role]: row.bind[first] } : {};
    extra.filter((item) => item !== role && roles.includes(item)).forEach((item) => {
      bind[item] = row.bind[item];
    });
    row.type = type;
    row.bind = bind;
    row.name = name;
    if (!hasUnit(type)) {
      delete row.unit;
    }
  }

  bindRole(row: DeviceRow, role: RoleId, key: string | null) {
    if (key) {
      row.bind[role] = key;
    } else {
      delete row.bind[role];
    }
  }

  private async _fetchStatus(): Promise<BackendStatus | null> {
    try {
      const response = await fetch(STATUS_URL, { cache: 'no-store' });
      const status = response.ok ? await response.json() : null;
      return typeof status?.has_config === 'boolean' ? status : null;
    } catch {
      return null;
    }
  }

  private _apply(parsed: ParsedConfig, modifiedAt: number | null) {
    runInAction(() => {
      this.devices = parsed.devices;
      this.raw = parsed.raw;
      this.orig = parsed.orig;
      this.mixed = parsed.mixed;
      this._modifiedAt = modifiedAt;
      this._savedModel = stable({ devices: parsed.devices });
      this._savedExtras = clone({ raw: parsed.raw, orig: parsed.orig, mixed: parsed.mixed });
      this._keepSelection();
    });
  }

  private _keepSelection() {
    if (!this.selected) {
      this.selection = this.devices.length ? { id: this.devices[0].id } : null;
    }
  }
}
