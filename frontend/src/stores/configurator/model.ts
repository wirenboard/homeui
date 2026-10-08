import { findType, requiredRoles, ROLES } from './catalog';
import type {
  BuiltConfig,
  Config,
  ConfigDevice,
  ConfigService,
  DeviceRow,
  Draft,
  EditorModel,
  LiveControls,
  OrigBinding,
  OwnDevice,
  ParsedConfig,
  RoleId,
  WbDevice,
} from './types';

export const topicOf = (deviceId: string, controlId: string) => `/devices/${deviceId}/controls/${controlId}`;

export const parseTopic = (topic: string): { dev: string; ctl: string } | null => {
  const match = /^\/devices\/([^/]+)\/controls\/([^/]+)$/.exec(topic || '');
  return match ? { dev: match[1], ctl: match[2] } : null;
};

export const splitKey = (key: string): [string, string] => {
  const index = key.indexOf('/');
  return [key.slice(0, index), key.slice(index + 1)];
};

// Сериализация с отсортированными ключами — для сравнения моделей.
export const stable = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stable).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
};

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// Роль, привязанная к контролу key (у строки устройства WB — её основная роль).
export const boundRole = (row: DeviceRow, key: string): RoleId | undefined =>
  (Object.keys(row.bind) as RoleId[]).find((role) => row.bind[role] === key);

// Сервисы строки: основная роль первой, остальные в порядке типа. ownKey — контрол строки устройства WB.
export const rowServices = (row: DeviceRow, ownKey?: string) => {
  if (!row.type) {
    return { list: [], missing: [] };
  }
  const roles = findType(row.type).roles.map(([role]) => role).filter((role) => row.bind[role]);
  const primary = ownKey ? boundRole(row, ownKey) : roles[0];
  const ordered = primary ? [primary, ...roles.filter((role) => role !== primary)] : roles;
  return {
    list: ordered.map((role) => ({ role, key: row.bind[role] })),
    missing: requiredRoles(row.type, row.bind).filter((role) => !row.bind[role]),
  };
};

const isRole = (role: unknown): role is RoleId => typeof role === 'string' && role in ROLES;

// Конфиг -> модель. В карточку устройства WB попадает запись, у которой все каналы из одного
// MQTT-устройства и module совпадает с ним; прочее собирается в созданные по module.
export const fromConfig = (config: Partial<Config> | null): ParsedConfig => {
  const wbs: WbDevice[] = [];
  const own: OwnDevice[] = [];
  const raw: unknown[] = [];
  const orig: ParsedConfig['orig'] = {};
  const mixed: Record<string, boolean> = {};
  const list = Array.isArray(config?.devices) ? config.devices : [];

  list.forEach((device: ConfigDevice) => {
    if (!device || typeof device !== 'object' || !findType(device.type)
      || !Array.isArray(device.services) || !device.services.length) {
      raw.push(device);
      return;
    }
    const services = device.services.map((service) => ({
      role: service?.role,
      topic: parseTopic(service?.binding?.state),
      service,
    }));
    if (!services.every((item) => item.topic && isRole(item.role))) {
      raw.push(device);
      return;
    }
    orig[device.did] = {};
    services.forEach(({ role, service }) => {
      orig[device.did][role] = { binding: service.binding, range: service.range };
    });
    const unit = services.find((item) => ROLES[item.role as RoleId]?.unit)?.service.unit;
    const matter = !!device.adapter_settings?.matter;
    const alice = !!device.adapter_settings?.alice;
    const firstDev = services[0].topic.dev;
    const bind: DeviceRow['bind'] = {};
    services.forEach((item) => {
      bind[item.role as RoleId] = `${item.topic.dev}/${item.topic.ctl}`;
    });
    const row: DeviceRow = {
      did: device.did, type: device.type, name: device.name || '', group: device.area || '', bind,
      ...(unit ? { unit } : {}),
    };

    if (services.every((item) => item.topic.dev === firstDev) && device.module === firstDev) {
      // Основная роль записана первой; её контрол — ключ строки.
      const ownControl = services[0].topic.ctl;
      let wb = wbs.find((item) => item.id === firstDev);
      if (!wb) {
        wb = { id: firstDev, matter, alice, channels: {} };
        wbs.push(wb);
      } else if (wb.matter !== matter || wb.alice !== alice) {
        mixed[firstDev] = true;
      }
      if (wb.channels[ownControl]) {
        raw.push(device);
        return;
      }
      wb.channels[ownControl] = row;
      return;
    }

    const name = String(device.module || '').trim();
    const id = `own:${name}`;
    let ownDevice = own.find((item) => item.id === id);
    if (!ownDevice) {
      ownDevice = { id, name, matter, alice, rows: [] };
      own.push(ownDevice);
    } else if (ownDevice.matter !== matter || ownDevice.alice !== alice) {
      mixed[id] = true;
    }
    ownDevice.rows.push(row);
  });

  return { wbs, own, raw, orig, mixed };
};

const toNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return value === undefined || value === null || value === '' || Number.isNaN(parsed) ? undefined : parsed;
};

const buildService = (
  sid: number, role: RoleId, deviceId: string, controlId: string, live: LiveControls, orig?: OrigBinding,
): ConfigService => {
  const topic = topicOf(deviceId, controlId);
  const meta = live.meta(deviceId, controlId);
  // Канал сейчас не публикуется — сохраняем исходную привязку без изменений.
  if (!meta && orig?.binding?.state === topic) {
    return orig.range ? { sid, role, binding: orig.binding, range: orig.range } : { sid, role, binding: orig.binding };
  }
  const binding: ConfigService['binding'] = { state: topic };
  if (ROLES[role].rw) {
    binding.command = `${topic}/on`;
  }
  if (ROLES[role].bool) {
    binding.transform = { type: 'boolean' };
  } else if (role === 'color') {
    binding.transform = { type: 'rgb_hs' };
  } else if (ROLES[role].scale && meta) {
    const min = toNumber(meta.min) ?? 0;
    const max = toNumber(meta.max);
    if (max !== undefined && (min !== 0 || max !== 100)) {
      binding.transform = { type: 'scale', from: { min, max }, to: { min: 0, max: 100 } };
    }
  }
  const service: ConfigService = { sid, role, binding };
  if (role === 'setting' && toNumber(meta?.max) !== undefined) {
    service.range = { min: toNumber(meta.min) ?? 0, max: toNumber(meta.max), step: toNumber(meta.step) ?? 1 };
  }
  if (role === 'color_temperature') {
    const low = toNumber(meta?.min);
    const high = toNumber(meta?.max);
    service.range = low !== undefined && high !== undefined
      ? { min: low, max: high, step: 100 }
      : { min: 2700, max: 6500, step: 100 };
  }
  return service;
};

// Модель -> конфиг. Устройства без канала для обязательной роли не пишутся, а попадают в drafts.
export const toConfig = (
  model: EditorModel & Pick<ParsedConfig, 'raw'>, live: LiveControls, orig: ParsedConfig['orig'],
): BuiltConfig => {
  let devices: ConfigDevice[] = [];
  const drafts: Draft[] = [];

  const makeDevice = (
    did: number, name: string, type: string, module: string, area: string, matter: boolean, alice: boolean,
    services: [RoleId, string, string][], rawUnit?: string,
  ): ConfigDevice => {
    const unit = rawUnit?.trim();
    return {
      did,
      name: name.trim() || `did ${did}`,
      type,
      module,
      ...(area?.trim() ? { area: area.trim() } : {}),
      adapter_settings: { matter, alice },
      services: services.map(([role, deviceId, controlId], index) => {
        const service = buildService(index + 1, role, deviceId, controlId, live, orig[did]?.[role]);
        return unit && ROLES[role].unit ? { ...service, unit } : service;
      }),
    };
  };

  const addRow = (row: DeviceRow, module: string, matter: boolean, alice: boolean, ownKey?: string) => {
    const { list, missing } = rowServices(row, ownKey);
    if (!row.type || missing.length) {
      drafts.push({ name: row.name, role: missing[0] ?? null });
      return;
    }
    devices.push(makeDevice(
      row.did, row.name, row.type, module, row.group, matter, alice,
      list.map(({ role, key }) => [role, ...splitKey(key)]),
      row.unit,
    ));
  };

  model.wbs.forEach((wb) => {
    Object.entries(wb.channels).forEach(([controlId, row]) => {
      addRow(row, wb.id, wb.matter, wb.alice, `${wb.id}/${controlId}`);
    });
  });

  model.own.forEach((ownDevice) => {
    const module = ownDevice.name.trim() || `own-${ownDevice.rows[0]?.did}`;
    ownDevice.rows.forEach((row) => addRow(row, module, ownDevice.matter, ownDevice.alice));
  });

  devices = devices.concat(model.raw as ConfigDevice[]);
  devices.sort((a, b) => (a?.did || 0) - (b?.did || 0));
  return { config: { version: '1.0', devices }, drafts };
};
