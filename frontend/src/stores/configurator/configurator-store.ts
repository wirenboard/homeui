import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import { makeAutoObservable, runInAction } from 'mobx';
import { clone, fromConfig, stable, toConfig } from './model';
import type {
  BackendState,
  BackendStatus,
  BuiltConfig,
  Config,
  LiveControls,
  OwnDevice,
  OwnRow,
  ParsedConfig,
  RoleId,
  Selection,
  WbChannel,
  WbDevice,
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
  wbs: WbDevice[] = [];
  own: OwnDevice[] = [];
  raw: unknown[] = [];
  orig: ParsedConfig['orig'] = {};
  mixed: Record<string, boolean> = {};
  selection: Selection = null;
  backendState: BackendState = 'checking';
  isLoading = false;
  isSaving = false;

  private _savedModel = stable({ wbs: [], own: [] });
  private _modifiedAt: number | null = null;
  private _savedExtras: Pick<ParsedConfig, 'raw' | 'orig' | 'mixed'> = { raw: [], orig: {}, mixed: {} };
  // Настройки снятых каналов: вернутся, если канал отметить снова.
  private _parked: Record<string, WbChannel> = {};

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isDirty() {
    return stable({ wbs: this.wbs, own: this.own }) !== this._savedModel
      || stable(this.raw) !== stable(this._savedExtras.raw);
  }

  get savedModel(): { wbs: WbDevice[]; own: OwnDevice[] } {
    return JSON.parse(this._savedModel);
  }

  get selectedWb() {
    return this.selection?.kind === 'wb' ? this.wbs.find((wb) => wb.id === this.selection.id) : undefined;
  }

  get selectedOwn() {
    return this.selection?.kind === 'own' ? this.own.find((item) => item.id === this.selection.id) : undefined;
  }

  // Ключи "device/control" всех каналов, уже занятых в модели.
  get usedKeys(): Set<string> {
    const used = new Set<string>();
    this.wbs.forEach((wb) => Object.entries(wb.channels).forEach(([controlId, channel]) => {
      used.add(`${wb.id}/${controlId}`);
      Object.values(channel.extra).forEach((extra) => extra && used.add(`${wb.id}/${extra}`));
    }));
    this.own.forEach((item) => item.rows.forEach((row) => Object.values(row.bind).forEach((key) => used.add(key))));
    return used;
  }

  build(live: LiveControls): BuiltConfig {
    return toConfig({ wbs: this.wbs, own: this.own, raw: this.raw }, live, this.orig);
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
        this.wbs = this.wbs.filter((wb) => Object.keys(wb.channels).length);
        this.own = this.own.filter((item) => item.rows.length);
        this.orig = fromConfig(built.config).orig;
        this.mixed = {};
        this._modifiedAt = saved?.modified_at ?? null;
        this._savedModel = stable({ wbs: this.wbs, own: this.own });
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
    this.wbs = parsed.wbs;
    this.own = parsed.own;
    this.raw = parsed.raw;
    this.orig = parsed.orig;
    this.mixed = parsed.mixed;
    this._parked = {};
    this.selection = null;
    this._keepSelection();
    return config.devices.length;
  }

  select(selection: Selection) {
    this.selection = selection;
  }

  revert() {
    const saved = this.savedModel;
    this.wbs = saved.wbs;
    this.own = saved.own;
    Object.assign(this, clone(this._savedExtras));
    this._parked = {};
    this._keepSelection();
  }

  clearAll() {
    this.wbs = [];
    this.own = [];
    this.selection = null;
  }

  nextDid(): number {
    const dids = [
      FIRST_DID - 1,
      ...this.wbs.flatMap((wb) => Object.values(wb.channels).map((channel) => channel.did)),
      ...this.own.flatMap((item) => item.rows.map((row) => row.did)),
      ...this.raw.map((device) => Number((device as { did?: number })?.did) || 0),
      ...Object.values(this._parked).map((channel) => channel.did),
      ...Object.keys(this.orig).map(Number),
    ];
    return Math.max(...dids) + 1;
  }

  addWb(id: string, channels: Record<string, Omit<WbChannel, 'did' | 'group' | 'extra'>>) {
    const firstDid = this.nextDid();
    const wb: WbDevice = { id, matter: true, alice: true, channels: {} };
    Object.entries(channels).forEach(([controlId, channel], index) => {
      wb.channels[controlId] = { ...channel, did: firstDid + index, group: '', extra: {} };
    });
    this.wbs.push(wb);
    this.selection = { kind: 'wb', id };
  }

  removeWb(id: string) {
    this.wbs = this.wbs.filter((wb) => wb.id !== id);
    this._keepSelection();
  }

  setAdapters(target: WbDevice | OwnDevice, adapters: { matter?: boolean; alice?: boolean }) {
    Object.assign(target, adapters);
  }

  toggleChannel(wb: WbDevice, controlId: string, defaults: Omit<WbChannel, 'did' | 'group' | 'extra'>) {
    const key = `${wb.id}/${controlId}`;
    if (wb.channels[controlId]) {
      this._parked[key] = clone(wb.channels[controlId]);
      delete wb.channels[controlId];
      return;
    }
    if (this._parked[key]) {
      wb.channels[controlId] = this._parked[key];
      delete this._parked[key];
      return;
    }
    const lastGroup = Object.values(wb.channels).map((channel) => channel.group).filter(Boolean).pop() ?? '';
    wb.channels[controlId] = { ...defaults, did: this.nextDid(), group: lastGroup, extra: {} };
  }

  updateChannel(channel: WbChannel, patch: Partial<Pick<WbChannel, 'name' | 'group' | 'type' | 'prim'>>) {
    if (patch.type && patch.type !== channel.type) {
      channel.extra = {};
    }
    Object.assign(channel, patch);
  }

  setExtra(channel: WbChannel, role: RoleId, controlId: string | null) {
    if (controlId) {
      channel.extra[role] = controlId;
    } else {
      delete channel.extra[role];
    }
  }

  addOwn(name: string, row: Omit<OwnRow, 'did'>) {
    const item: OwnDevice = {
      id: `own:new:${Date.now()}`, name, matter: true, alice: true, rows: [{ ...row, did: this.nextDid() }],
    };
    this.own.push(item);
    this.selection = { kind: 'own', id: item.id };
  }

  removeOwn(id: string) {
    this.own = this.own.filter((item) => item.id !== id);
    this._keepSelection();
  }

  setOwnName(item: OwnDevice, name: string) {
    item.name = name;
  }

  addOwnRow(item: OwnDevice, row: Omit<OwnRow, 'did' | 'group'>) {
    const lastGroup = item.rows.map((existing) => existing.group).filter(Boolean).pop() ?? '';
    item.rows.unshift({ ...row, did: this.nextDid(), group: lastGroup });
  }

  updateOwnRow(row: OwnRow, patch: Partial<Pick<OwnRow, 'name' | 'group'>>) {
    Object.assign(row, patch);
  }

  bindOwnRole(row: OwnRow, role: RoleId, key: string | null) {
    if (key) {
      row.bind[role] = key;
    } else {
      delete row.bind[role];
    }
  }

  removeOwnRow(item: OwnDevice, did: number) {
    item.rows = item.rows.filter((row) => row.did !== did);
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
      this.wbs = parsed.wbs;
      this.own = parsed.own;
      this.raw = parsed.raw;
      this.orig = parsed.orig;
      this.mixed = parsed.mixed;
      this._modifiedAt = modifiedAt;
      this._parked = {};
      this._savedModel = stable({ wbs: parsed.wbs, own: parsed.own });
      this._savedExtras = clone({ raw: parsed.raw, orig: parsed.orig, mixed: parsed.mixed });
      this._keepSelection();
    });
  }

  private _keepSelection() {
    if (this.selectedWb || this.selectedOwn) {
      return;
    }
    if (this.wbs.length) {
      this.selection = { kind: 'wb', id: this.wbs[0].id };
    } else if (this.own.length) {
      this.selection = { kind: 'own', id: this.own[0].id };
    } else {
      this.selection = null;
    }
  }
}
